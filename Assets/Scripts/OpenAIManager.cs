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
