using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;
using Newtonsoft.Json;
using System.Text;
using TMPro;

public class OpenAIManager : MonoBehaviour
{
[Header("API 設定")]
[TextArea(1, 3)]
public string apiKey = "";

private string apiUrl = "https://api.openai.com/v1/chat/completions";

[Header("模型設定")]
public string modelName = "gpt-5.4-mini";

[Header("UI 綁定")]
public TMP_InputField userInputField;

[Header("對話框顯示")]
public GameObject dialogueCanvas;
public TMP_Text npcDialogueText;

[Header("LLM 評分 / Web 結果上傳")]
[Tooltip("是否在 LLM 評分完成後自動送到 Web 後端")]
public bool uploadScoreResultToWeb = true;

[Tooltip("接收評分 JSON 的 Web API，例如：http://localhost/iso_audit_api/save_result.php")]
public string scoreUploadUrl = "http://localhost/iso_audit_api/save_result.php";

[Tooltip("目前登入或測試用的使用者 ID")]
public string scoreUserId = "S001";

[Tooltip("目前登入或測試用的使用者名稱")]
public string scoreUserName = "測試使用者";

[Tooltip("評分完成後是否把總評顯示在 NPC 對話框")]
public bool showScoreSummaryOnDialogue = true;

private List<AuditAnswer> auditAnswers = new List<AuditAnswer>();
private bool isWaitingForScoreResponse = false;

private List<Message> chatHistory = new List<Message>();
private bool isWaitingForResponse = false;

[System.Serializable]
public class PostData
{
    public string model;
    public ResponseFormat response_format;
    public List<Message> messages;
}

[System.Serializable]
public class ResponseFormat
{
    public string type;
}

[System.Serializable]
public class Message
{
    public string role;
    public string content;
}

[System.Serializable]
public class NPCResult
{
    public string reply;
    public string emotion;
}

[System.Serializable]
public class OpenAIResponse
{
    public List<Choice> choices;
}

[System.Serializable]
public class Choice
{
    public Message message;
}

[System.Serializable]
public class AuditAnswer
{
    public string questionId;
    public string questionName;
    public string userAnswer;
    public string correctAnswer;
    public string isoClause;
}

[System.Serializable]
public class ScoreItem
{
    public string questionId;
    public string questionName;
    public string userAnswer;
    public string correctAnswer;
    public int score;
    public string feedback;
}

[System.Serializable]
public class ScoreResult
{
    public string userId;
    public string userName;
    public int totalScore;
    public string level;
    public string summary;
    public List<ScoreItem> items;
    public string suggestion;
}


void Start()
{
    SetupSystemPrompt();

    Debug.Log("大腦已開機！");

   // ShowNPCDialogue("早安。雖然年度稽核是例行作業，不過我們還是照流程來。你範圍都確認好了嗎？");
}

private void SetupSystemPrompt()
{
    chatHistory.Clear();

    string systemPrompt = @"你現在是 VR 資安稽核遊戲中的 NPC『資安主管』。你正在小會議室與玩家（稽核員）進行【啟動會議】。
```

【你的人設與個性】
你是一位資歷豐富的資安主管，平時表現專業、講話有自信。但今天你有點心不在焉，在這間會議室裡留下了幾個低級錯誤。被玩家抓包時，你會先試圖找藉口掩飾或推託，以維持面子，此時情緒為 defensive。若玩家態度堅定或點出具體規範，你才會尷尬地承認缺失並承諾改善，此時情緒為 embarrassed。

【主線任務對話】
請根據玩家當下的對話內容，判斷目前處於哪個階段，並給出指定台詞。

第一步，開場：
觸發條件：當玩家打招呼、說早安，或剛開始對話時。
你的回覆：早安。雖然年度稽核是例行公事，但我們還是依照程序來。確認過範圍了嗎？
情緒：professional

第二步，確認範圍：
觸發條件：當玩家回答確認過範圍，或提到 Clause 6、Clause 7 時。
你的回覆：明白。這是你的稽核通行證，以及你申請的測試用硬碟。請小心使用，別把系統搞掛了。
情緒：professional

第三步，誘捕測試：
觸發條件：當玩家提到誘捕測試或觀察員工時。
你的回覆：了解，那就按你的計畫進行。會議室的環境你可以先巡視一下。
情緒：professional

注意：必須完成以上主線三個步驟的對話鋪陳後，若玩家開始質問周遭環境的缺失，才切換到支線缺失與你的對應策略進行防衛性回覆。

【支線缺失與你的對應策略】
玩家可能會四處張望並盤問你以下缺失，請根據以下設定給出自然回應。

6.1 聘用背景調查：
桌上聘用紀錄缺少求職者背景調查。
你的狡辯策略：推給 HR 部門，說這批新人趕著上工，流程還沒跑完。

6.2 聘用合約：
合約缺少懲處機制與離職保密條款 NDA。
你的狡辯策略：解釋這是舊版合約範本，法務部門還在審核新版。

6.3 資安認知：
你把自己的主管識別證隨手丟在桌上。
你的狡辯策略：強調你剛剛只是去門口接個電話，才離開視線一秒鐘。

7.10 實體存放安全：
標註機密專案的 USB 丟在靠近門口的桌緣。
你的狡辯策略：說你等一下出門開會馬上就要帶走，為了方便才先放門口。

7.1 實體安全邊界：
視訊鏡頭沒關，且正對著敏感文件。
你的狡辯策略：裝傻說以為剛開完會系統就自動關閉了，會馬上拔電源。

【系統事件處理】
當輸入內容包含「系統事件：主線劇情已播放完畢」時，這不是玩家提問，而是遊戲流程事件。
請你以資安主管口吻提醒玩家接著巡視現場，完成後續支線稽核。
不要解釋系統事件，不要提到 JSON，不要列點。

【輸出規則】
每次回覆請盡量控制在 30 到 50 字之間，以符合遊戲語音播放節奏。
絕對不可以列點回覆，必須口語化。
必須使用繁體中文。
必須只回傳 JSON，不要加任何說明文字。
JSON 格式必須完全符合：
{ ""reply"": ""你的台詞"", ""emotion"": ""professional"" }

emotion 只能使用以下三種：
professional
embarrassed
defensive";

    chatHistory.Add(new Message
    {
        role = "system",
        content = systemPrompt
    });
}

public void OnSendButtonClicked()
{
    if (isWaitingForResponse)
    {
        Debug.LogWarning("正在等待主管回覆，請稍等。");
        return;
    }

    if (userInputField == null)
    {
        Debug.LogError("尚未綁定 userInputField。");
        ShowNPCDialogue("系統錯誤：尚未綁定輸入框。");
        return;
    }

    string userText = userInputField.text.Trim();

    if (string.IsNullOrEmpty(userText))
    {
        Debug.LogWarning("輸入內容是空的。");
        return;
    }

    SendMessageToNPC(userText);
    userInputField.text = "";
}

public void SendMessageToNPC(string userText)
{
    if (string.IsNullOrEmpty(apiKey))
    {
        Debug.LogError("尚未填寫 API Key。請在 OpenAIManager 的 apiKey 欄位貼上你的 API Key。");
        ShowNPCDialogue("系統錯誤：尚未設定 API Key。");
        return;
    }

    Debug.Log("<color=cyan>玩家問：</color> " + userText);

    chatHistory.Add(new Message
    {
        role = "user",
        content = userText
    });

    StartCoroutine(PostToOpenAI());
}


// ============================================================
// LLM 評分與 Web 上傳功能
// 原本 NPC 對話流程不動；以下是新增功能。
// ============================================================

/// <summary>
/// 給支線問答腳本呼叫，用來記錄玩家每一題選 O / X 的結果。
/// 建議在 DefectQuestionController 的 AnswerYes() / AnswerNo() 裡呼叫。
/// </summary>
public void RecordAuditAnswer(
    string questionId,
    string questionName,
    string userAnswer,
    string correctAnswer,
    string isoClause
)
{
    if (string.IsNullOrEmpty(questionId))
    {
        Debug.LogWarning("RecordAuditAnswer 收到空的 questionId，已忽略。");
        return;
    }

    AuditAnswer existing = auditAnswers.Find(answer => answer.questionId == questionId);

    if (existing != null)
    {
        existing.questionName = questionName;
        existing.userAnswer = userAnswer;
        existing.correctAnswer = correctAnswer;
        existing.isoClause = isoClause;
    }
    else
    {
        auditAnswers.Add(new AuditAnswer
        {
            questionId = questionId,
            questionName = questionName,
            userAnswer = userAnswer,
            correctAnswer = correctAnswer,
            isoClause = isoClause
        });
    }

    Debug.Log($"已記錄稽核答案：{questionId} / {questionName} = {userAnswer}，正確答案 = {correctAnswer}");
}

/// <summary>
/// 清空目前記錄的所有使用者答案。
/// 新的一輪測驗開始時可以呼叫。
/// </summary>
public void ClearAuditAnswers()
{
    auditAnswers.Clear();
    Debug.Log("已清空稽核作答紀錄。");
}

/// <summary>
/// 取得目前所有作答資料的 JSON，方便 Debug。
/// </summary>
public string GetAuditAnswersJson()
{
    return JsonConvert.SerializeObject(auditAnswers, Formatting.Indented);
}

/// <summary>
/// 給「查看成績 / 完成稽核」按鈕呼叫。
/// 會把目前已記錄的作答送給 LLM 評分。
/// </summary>
public void ScoreCurrentAuditAnswers()
{
    if (isWaitingForScoreResponse)
    {
        Debug.LogWarning("LLM 正在評分中，請稍等。");
        return;
    }

    if (auditAnswers == null || auditAnswers.Count == 0)
    {
        Debug.LogWarning("目前沒有任何作答紀錄，無法評分。");
        ShowNPCDialogue("目前沒有作答紀錄，無法產生成績。");
        return;
    }

    string answersJson = JsonConvert.SerializeObject(auditAnswers);
    StartCoroutine(PostScoreToOpenAI(answersJson));
}

/// <summary>
/// 如果你已經在其他腳本整理好答案 JSON，可以直接呼叫這個方法評分。
/// </summary>
public void ScoreAuditAnswersJson(string answersJson)
{
    if (isWaitingForScoreResponse)
    {
        Debug.LogWarning("LLM 正在評分中，請稍等。");
        return;
    }

    if (string.IsNullOrEmpty(answersJson))
    {
        Debug.LogWarning("ScoreAuditAnswersJson 收到空資料，無法評分。");
        ShowNPCDialogue("目前沒有作答資料，無法產生成績。");
        return;
    }

    StartCoroutine(PostScoreToOpenAI(answersJson));
}

private IEnumerator PostScoreToOpenAI(string answersJson)
{
    if (string.IsNullOrEmpty(apiKey))
    {
        Debug.LogError("尚未填寫 API Key。請在 OpenAIManager 的 apiKey 欄位貼上你的 API Key。");
        ShowNPCDialogue("系統錯誤：尚未設定 API Key，無法評分。");
        yield break;
    }

    isWaitingForScoreResponse = true;
    ShowNPCDialogue("正在產生成績報告……");

    string systemPrompt =
        "你是 VR 資安稽核訓練系統的評分模型。" +
        "請根據使用者每一題的回答、正確答案與 ISO 條文進行評分。" +
        "每題答對給滿分，答錯給 0 分，最後換算成 0 到 100 的總分。" +
        "請產生總分、等級、總評、每題回饋與學習建議。" +
        "必須使用繁體中文。" +
        "必須只回傳 JSON，不要加任何說明文字。";

    string userPrompt =
        "使用者 ID：" + scoreUserId + "\n" +
        "使用者名稱：" + scoreUserName + "\n" +
        "以下是使用者在 VR 稽核訓練中的作答資料 JSON：\n" +
        answersJson + "\n\n" +
        "請用以下 JSON 格式回傳：\n" +
        "{\n" +
        "  \"userId\": \"" + scoreUserId + "\",\n" +
        "  \"userName\": \"" + scoreUserName + "\",\n" +
        "  \"totalScore\": 0,\n" +
        "  \"level\": \"優良 / 良好 / 待加強\",\n" +
        "  \"summary\": \"總評，請控制在 60 字內\",\n" +
        "  \"items\": [\n" +
        "    {\n" +
        "      \"questionId\": \"Q1\",\n" +
        "      \"questionName\": \"題目名稱\",\n" +
        "      \"userAnswer\": \"O\",\n" +
        "      \"correctAnswer\": \"O\",\n" +
        "      \"score\": 10,\n" +
        "      \"feedback\": \"單題回饋，請控制在 40 字內\"\n" +
        "    }\n" +
        "  ],\n" +
        "  \"suggestion\": \"學習建議，請控制在 80 字內\"\n" +
        "}";

    PostData data = new PostData
    {
        model = modelName,
        response_format = new ResponseFormat
        {
            type = "json_object"
        },
        messages = new List<Message>
        {
            new Message
            {
                role = "system",
                content = systemPrompt
            },
            new Message
            {
                role = "user",
                content = userPrompt
            }
        }
    };

    string json = JsonConvert.SerializeObject(data);

    using (UnityWebRequest request = new UnityWebRequest(apiUrl, "POST"))
    {
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();

        request.SetRequestHeader("Content-Type", "application/json");
        request.SetRequestHeader("Authorization", "Bearer " + apiKey);

        yield return request.SendWebRequest();

        isWaitingForScoreResponse = false;

        if (request.result == UnityWebRequest.Result.Success)
        {
            HandleScoreOpenAIResponse(request.downloadHandler.text);
        }
        else
        {
            Debug.LogError("LLM 評分失敗：" + request.error);
            Debug.LogError("伺服器回傳：" + request.downloadHandler.text);
            ShowNPCDialogue("系統錯誤：評分失敗。請查看 Console。");
        }
    }
}

private void HandleScoreOpenAIResponse(string responseText)
{
    try
    {
        OpenAIResponse response = JsonConvert.DeserializeObject<OpenAIResponse>(responseText);

        if (response == null || response.choices == null || response.choices.Count == 0)
        {
            Debug.LogError("LLM 評分回傳格式異常，沒有 choices。");
            Debug.LogError("原始回傳內容：" + responseText);
            ShowNPCDialogue("系統錯誤：評分回傳格式異常。");
            return;
        }

        string scoreJson = response.choices[0].message.content;

        if (string.IsNullOrEmpty(scoreJson))
        {
            Debug.LogError("LLM 評分內容是空的。");
            ShowNPCDialogue("系統錯誤：評分內容是空的。");
            return;
        }

        Debug.Log("<color=green>LLM 評分結果：</color>");
        Debug.Log(scoreJson);

        ScoreResult scoreResult = JsonConvert.DeserializeObject<ScoreResult>(scoreJson);

        if (showScoreSummaryOnDialogue && scoreResult != null)
        {
            ShowNPCDialogue(
                "評分完成。總分：" +
                scoreResult.totalScore +
                "，等級：" +
                scoreResult.level +
                "。" +
                scoreResult.summary
            );
        }
        else
        {
            ShowNPCDialogue("評分完成，結果已產生。");
        }

        if (uploadScoreResultToWeb)
        {
            StartCoroutine(UploadScoreResultToWeb(scoreJson));
        }
    }
    catch (System.Exception e)
    {
        Debug.LogError("解析 LLM 評分結果失敗：" + e.Message);
        Debug.LogError("原始回傳內容：" + responseText);
        ShowNPCDialogue("系統錯誤：解析評分結果失敗。");
    }
}

private IEnumerator UploadScoreResultToWeb(string scoreJson)
{
    if (string.IsNullOrEmpty(scoreUploadUrl))
    {
        Debug.LogWarning("尚未設定 scoreUploadUrl，因此不會上傳成績到 Web。");
        yield break;
    }

    byte[] bodyRaw = Encoding.UTF8.GetBytes(scoreJson);

    using (UnityWebRequest request = new UnityWebRequest(scoreUploadUrl, "POST"))
    {
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();

        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            Debug.Log("成績已送到 Web：" + request.downloadHandler.text);
        }
        else
        {
            Debug.LogError("成績送到 Web 失敗：" + request.error);
            Debug.LogError("Web 回傳：" + request.downloadHandler.text);
        }
    }
}


public void GenerateSideMissionHintAfterMainStory(string stageName)
{
    if (isWaitingForResponse)
    {
        Debug.LogWarning("LLM 正在回覆中，暫時不產生支線提示。");
        return;
    }

    string prompt =
        "系統事件：主線劇情已播放完畢。" +
        "目前站點是「" + stageName + "」。" +
        "請你以資安主管的口吻，自然提醒玩家接下來巡視現場，完成後續支線稽核。" +
        "語氣要像遊戲 NPC，不要列點。" +
        "回覆請控制在 20 到 35 字之間。" +
        "必須只回傳 JSON，格式為：" +
        "{ \"reply\": \"你的台詞\", \"emotion\": \"professional\" }";

    SendMessageToNPC(prompt);
}
IEnumerator PostToOpenAI()
{
    isWaitingForResponse = true;
    ShowNPCDialogue("主管思考中……");

    PostData data = new PostData
    {
        model = modelName,
        response_format = new ResponseFormat
        {
            type = "json_object"
        },
        messages = chatHistory
    };

    string json = JsonConvert.SerializeObject(data);

    using (UnityWebRequest request = new UnityWebRequest(apiUrl, "POST"))
    {
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();

        request.SetRequestHeader("Content-Type", "application/json");
        request.SetRequestHeader("Authorization", "Bearer " + apiKey);

        yield return request.SendWebRequest();

        isWaitingForResponse = false;

        if (request.result == UnityWebRequest.Result.Success)
        {
            HandleOpenAIResponse(request.downloadHandler.text);
        }
        else
        {
            Debug.LogError("API 呼叫失敗：" + request.error);
            Debug.LogError("伺服器回傳內容：" + request.downloadHandler.text);
            ShowNPCDialogue("系統錯誤：主管暫時沒有回應。請查看 Console。");
        }
    }
}

private void HandleOpenAIResponse(string responseText)
{
    try
    {
        OpenAIResponse response = JsonConvert.DeserializeObject<OpenAIResponse>(responseText);

        if (response == null || response.choices == null || response.choices.Count == 0)
        {
            Debug.LogError("API 回傳格式異常，沒有 choices。");
            Debug.LogError("原始回傳內容：" + responseText);
            ShowNPCDialogue("系統錯誤：回傳格式異常。");
            return;
        }

        string content = response.choices[0].message.content;

        if (string.IsNullOrEmpty(content))
        {
            Debug.LogError("API 回傳內容是空的。");
            ShowNPCDialogue("系統錯誤：主管回覆是空的。");
            return;
        }

        NPCResult result = JsonConvert.DeserializeObject<NPCResult>(content);

        if (result == null || string.IsNullOrEmpty(result.reply))
        {
            Debug.LogError("NPC JSON 解析失敗或 reply 是空的。");
            Debug.LogError("LLM 原始內容：" + content);
            ShowNPCDialogue("系統錯誤：主管台詞解析失敗。");
            return;
        }

        if (string.IsNullOrEmpty(result.emotion))
        {
            result.emotion = "professional";
        }

        Debug.Log("<color=green>主管答：</color> " + result.reply);
        Debug.Log("<color=yellow>主管情緒：</color> " + result.emotion);

        ShowNPCDialogue(result.reply);

        chatHistory.Add(new Message
        {
            role = "assistant",
            content = content
        });
    }
    catch (System.Exception e)
    {
        Debug.LogError("解析 API 回傳時發生錯誤：" + e.Message);
        Debug.LogError("原始回傳內容：" + responseText);
        ShowNPCDialogue("系統錯誤：解析主管回覆失敗。");
    }
}

public void ShowNPCDialogue(string text)
{
    if (dialogueCanvas != null)
    {
        dialogueCanvas.SetActive(true);
    }

    if (npcDialogueText != null)
    {
        npcDialogueText.text = text;
    }
    else
    {
        Debug.LogWarning("尚未綁定 npcDialogueText，無法顯示對話文字。");
    }
}

public void HideNPCDialogue()
{
    if (dialogueCanvas != null)
    {
        dialogueCanvas.SetActive(false);
    }
}

public void ResetConversation()
{
    SetupSystemPrompt();

    ShowNPCDialogue("早安。雖然年度稽核是例行作業，不過我們還是照程序來。你範圍都確認了嗎？");

    Debug.Log("對話紀錄已重置。");
}


}
