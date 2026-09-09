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
public string modelName = "gpt-5.6-luna";

[Header("UI 綁定")]
public TMP_InputField userInputField;

[Header("對話框顯示")]
public GameObject dialogueCanvas;
public TMP_Text npcDialogueText;

[Header("Node.js / MySQL 最終評分")]
[Tooltip("既有 authController 的完成 Session API。會使用 MySQL 本次 session 的 15 題正式成績。")]
public string completeSessionUrl = "http://192.168.100.147:3000/api/unity/complete-session";

[Tooltip("自動從場景中的 UnityAnswerApi 讀取 /api/unity/answers 網址，讓 OpenAIManager 與作答 API 永遠連到同一台 Node.js。")]
public bool autoSyncBackendUrlFromUnityAnswerApi = true;

[Tooltip("最後一題若仍在寫入 MySQL，complete-session 回 409 時自動重試的次數。")]
[Range(0, 10)]
public int scoreRetryCount = 4;

[Tooltip("最終評分重試間隔秒數。")]
public float scoreRetryDelaySeconds = 0.75f;

[Tooltip("資料庫 users.id。正式登入後會優先自動從 UnityAnswerApi 同步；也可由登入流程呼叫 SetLoggedInUser()。")]
public int scoreUserId = 0;

[Tooltip("本次 training_sessions.id。正式登入後會優先自動從 UnityAnswerApi 同步。")]
public int scoreSessionId = 0;

[Tooltip("目前登入使用者名稱，僅供 LLM 回饋顯示，不參與計分。")]
public string scoreUserName = "使用者";

[Tooltip("本次訓練時數；完成 Session 時會一起寫入 vr_training_records.duration_hours。")]
public float trainingDurationHours = 0f;

[Tooltip("是否讓 LLM 產生個人化總評與學習建議。LLM 絕不參與分數計算。")]
public bool useLlmForSummary = true;

[Tooltip("評分完成後是否把總評顯示在 NPC 對話框")]
public bool showScoreSummaryOnDialogue = true;

private List<AuditAnswer> auditAnswers = new List<AuditAnswer>();
private bool isWaitingForScoreResponse = false;
private ScoreResult lastScoreResult;

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
    // Unity 內部固定代碼，例如 S1_BADGE。
    public string questionId;

    // 對應資料庫 questions.id / user_answers.question_id。
    public int dbQuestionId;

    public string questionName;
    public string userAnswer;
    public string correctAnswer;
    public string isoClause;
}

[System.Serializable]
public class ScoreItem
{
    public string questionId;
    public int dbQuestionId;
    public int stageNo;
    public string interactionType;
    public string questionName;
    public string userAnswer;
    public string correctAnswer;

    // score：本題對雷達原始 10 分制的實得點數（例如 5 / 2 / 1 / 0）。
    public int score;

    // databaseScore：questions.score / user_answers.score 的實際資料庫得分。
    public int databaseScore;

    // radarPoint：本題在雷達指標中的固定配分。
    public int radarPoint;

    public string isoClause;
    public string abilityCategory;
    public bool isCorrect;
    public string feedback;
}


[System.Serializable]
public class DashboardKpi
{
    public int auditScore;
    public float trainingHours;
    public int identifiedRisks;
    public int accuracyRate;
}

[System.Serializable]
public class HistoryPoint
{
    public string session;
    public int score;
}

[System.Serializable]
public class ScoreResult
{
    public int userId;
    public string userName;
    public int sessionId;
    public int totalScore;
    public int radarTotalScore;
    public string level;
    public int answeredCount;
    public int correctCount;
    public int accuracyRate;
    public DashboardKpi kpi;
    public Dictionary<string, int> radar;
    public List<int> radarScores;
    public List<HistoryPoint> history;
    public string summary;
    public List<ScoreItem> items;
    public string suggestion;
}


[System.Serializable]
public class ScoreNarrativeResult
{
    public string summary;
    public string suggestion;
}

// 與 MySQL user_answers 欄位對齊的 JSON 物件。
[System.Serializable]
public class CompleteSessionRequest
{
    public int userId;
    public int sessionId;
    public float duration;
    public int blocks;
}

[System.Serializable]
public class BackendScoreResponse
{
    public bool success;
    public string message;
    public bool finalized;
    public bool persisted;
    public ScoreResult data;
    public ScoreResult progress;
}

[System.Serializable]
public class AIFeedbackSaveRequest
{
    public int userId;
    public int sessionId;
    public string summary;
    public string suggestion;
}

[System.Serializable]
public class DbAnswerPayload
{
    public int user_id;
    public int session_id;
    public int question_id;
    public string selected_option;
    public int is_correct;
    public int score;
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

public void OnSendButtonClick()
{
    OnSendButtonClicked();
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
// 稽核作答 / 資料庫欄位對應 / 固定評分 / LLM 總評
// ============================================================

private const string CAT_ACCESS = "身分憑證與門禁管理";
private const string CAT_DEVICE = "設備與儲存媒體防護";
private const string CAT_DOCUMENT = "文件與敏感資訊保護";
private const string CAT_ENVIRONMENT = "辦公環境安全管理";
private const string CAT_SERVER = "機房與資產管理";

private class QuestionDefinition
{
    public int dbQuestionId;
    public string code;
    public string name;
    public string correctAnswer;
    public string isoClause;
    public string abilityCategory;
    public int radarRawPoint;

    public QuestionDefinition(
        int dbQuestionId,
        string code,
        string name,
        string correctAnswer,
        string isoClause,
        string abilityCategory,
        int radarRawPoint)
    {
        this.dbQuestionId = dbQuestionId;
        this.code = code;
        this.name = name;
        this.correctAnswer = correctAnswer;
        this.isoClause = isoClause;
        this.abilityCategory = abilityCategory;
        this.radarRawPoint = radarRawPoint;
    }
}

// IMPORTANT：這裡就是 Unity question_code 與 MySQL question_id 的唯一對照表。
// 依你目前資料庫的 1~10、61~65 題號整理。
// 之後若 questions.id 有改，只要改這 15 行，不要去改評分公式。
private static readonly List<QuestionDefinition> FormalQuestions = new List<QuestionDefinition>
{
    // 第一站
    new QuestionDefinition(1,  "S1_BADGE",               "主管隨意放置主管專用識別證",      "O", "A.6 / A.7 身分憑證與門禁管理",         CAT_ACCESS,      5),
    new QuestionDefinition(2,  "S1_EXPIRED_PASS",        "提供已失效的稽核通行證",          "C", "A.7 實體進出與門禁管理",               CAT_ACCESS,      5),
    new QuestionDefinition(3,  "S1_USB",                 "存有重要檔案的 USB 硬碟隨意放在桌緣", "X", "A.7.10 儲存媒體",                    CAT_DEVICE,      5),
    new QuestionDefinition(61, "S1_MANAGEMENT_REVIEW",   "管理審查報告缺失辨識",            "C", "文件與敏感資訊保護",                    CAT_DOCUMENT,    2),
    new QuestionDefinition(62, "S1_EMPLOYEE_EVALUATION", "員工評核表缺失辨識",              "C", "人員資料與文件保護",                    CAT_DOCUMENT,    1),

    // 第二站
    new QuestionDefinition(4,  "S2_TABLET",               "未上鎖的平板放置於辦公桌面上",      "O", "A.7.7 桌面淨空及螢幕淨空",              CAT_DEVICE,      5),
    new QuestionDefinition(5,  "S2_VISITOR_CARD",         "重要訪客名片隨意放置在辦公桌上",    "X", "文件與個人資訊保護",                    CAT_DOCUMENT,    1),
    new QuestionDefinition(6,  "S2_COFFEE",               "未加蓋咖啡放在電腦旁",              "O", "A.7.5 防範實體與環境威脅",              CAT_ENVIRONMENT, 2),
    new QuestionDefinition(7,  "S2_INTERNAL_DOCUMENT",    "公司內部文件隨意放置",              "X", "A.7.7 桌面淨空及螢幕淨空",              CAT_DOCUMENT,    1),
    new QuestionDefinition(63, "S2_EMPLOYMENT_CONTRACT",  "聘用合約缺失辨識",                  "C", "A.6 人員控制 / 文件保護",                CAT_DOCUMENT,    4),

    // 第三站
    new QuestionDefinition(10, "S3_PASSWORD_NOTE",        "帳號密碼寫在便利貼上",              "X", "A.5.17 鑑別資訊",                       CAT_DOCUMENT,    1),
    new QuestionDefinition(8,  "S3_EWASTE",               "機房堆放報廢電子設備",              "O", "A.7.5 / 資產管理",                      CAT_SERVER,      5),
    new QuestionDefinition(9,  "S3_CAKE",                 "管制機房內放置食物",                "O", "A.7.5 防範實體與環境威脅",              CAT_ENVIRONMENT, 2),
    new QuestionDefinition(64, "S3_SECURITY_POSTER",      "資安海報缺失辨識",                  "C", "資訊安全認知與辦公環境安全",              CAT_ENVIRONMENT, 6),
    new QuestionDefinition(65, "S3_MAINTENANCE_RECORD",   "機房設備維修與維護登記表缺失辨識",  "C", "機房維護與資產管理",                    CAT_SERVER,      5)
};

/// <summary>
/// 登入成功後可直接呼叫。正式評分需要 users.id + training_sessions.id。
/// </summary>
public void SetLoggedInUser(int userId, string userName, int sessionId = 0)
{
    if (userId <= 0)
    {
        Debug.LogError("SetLoggedInUser 收到無效 userId：" + userId);
        return;
    }

    scoreUserId = userId;
    scoreUserName = string.IsNullOrWhiteSpace(userName) ? "使用者" : userName.Trim();

    if (sessionId > 0)
    {
        scoreSessionId = sessionId;
    }

    Debug.Log($"✅ OpenAIManager 登入資訊：user_id={scoreUserId}, session_id={scoreSessionId}");
}

// 相容舊版：第三個參數原本可能是 string。
public void SetLoggedInUser(int userId, string userName, string sessionId)
{
    int parsedSessionId = 0;
    int.TryParse(sessionId, out parsedSessionId);
    SetLoggedInUser(userId, userName, parsedSessionId);
}

public void SetLoggedInUserFromString(string userId, string userName, string sessionId = "")
{
    int parsedUserId;
    int parsedSessionId = 0;

    if (!int.TryParse(userId, out parsedUserId))
    {
        Debug.LogError("userId 必須是資料庫 users.id 的數字。收到：" + userId);
        return;
    }

    int.TryParse(sessionId, out parsedSessionId);
    SetLoggedInUser(parsedUserId, userName, parsedSessionId);
}

public void SetSessionId(int sessionId)
{
    if (sessionId <= 0)
    {
        Debug.LogWarning("SetSessionId 收到無效 sessionId：" + sessionId);
        return;
    }

    scoreSessionId = sessionId;
}

public void SetSessionId(string sessionId)
{
    int parsed;
    if (int.TryParse(sessionId, out parsed))
    {
        SetSessionId(parsed);
    }
}

/// <summary>
/// 相容既有支線腳本的本地 Debug 紀錄。
/// 注意：正式最終評分完全不使用這份 List；真正答案以 MySQL user_answers + session_id 為準。
/// </summary>
public void RecordAuditAnswer(
    string questionId,
    string questionName,
    string userAnswer,
    string correctAnswer,
    string isoClause)
{
    if (string.IsNullOrWhiteSpace(questionId))
    {
        return;
    }

    QuestionDefinition definition = FindDefinition(questionId);
    string canonicalCode = definition != null ? definition.code : questionId.Trim();
    string normalizedUserAnswer = NormalizeOption(userAnswer);

    AuditAnswer existing = auditAnswers.Find(answer => answer.questionId == canonicalCode);
    if (existing == null)
    {
        existing = new AuditAnswer();
        auditAnswers.Add(existing);
    }

    existing.questionId = canonicalCode;
    existing.dbQuestionId = definition != null ? definition.dbQuestionId : ParseIntOrZero(questionId);
    existing.questionName = definition != null ? definition.name : (questionName ?? "");
    existing.userAnswer = normalizedUserAnswer;
    existing.correctAnswer = definition != null ? definition.correctAnswer : NormalizeOption(correctAnswer);
    existing.isoClause = definition != null ? definition.isoClause : (isoClause ?? "");

    Debug.Log($"📝 本地 Debug 作答：{canonicalCode} = {normalizedUserAnswer}（正式成績仍以 MySQL 為準）");
}

public void RecordAuditAnswerByDatabaseId(int questionId, string selectedOption)
{
    QuestionDefinition definition = FindDefinitionByDbId(questionId);
    RecordAuditAnswer(
        definition != null ? definition.code : questionId.ToString(),
        definition != null ? definition.name : "",
        selectedOption,
        definition != null ? definition.correctAnswer : "",
        definition != null ? definition.isoClause : ""
    );
}

public void RecordAuditAnswerByBool(
    string questionId,
    string questionName,
    bool userAnswerIsYes,
    bool correctAnswerIsYes,
    string isoClause)
{
    RecordAuditAnswer(
        questionId,
        questionName,
        userAnswerIsYes ? "O" : "X",
        correctAnswerIsYes ? "O" : "X",
        isoClause
    );
}

public void ClearAuditAnswers()
{
    auditAnswers.Clear();
    Debug.Log("已清空 OpenAIManager 本地 Debug 作答紀錄。MySQL 資料不受影響。");
}

public string GetAuditAnswersJson()
{
    return JsonConvert.SerializeObject(auditAnswers, Formatting.Indented);
}

public string GetDatabaseAnswerRowsJson()
{
    List<DbAnswerPayload> rows = new List<DbAnswerPayload>();

    foreach (AuditAnswer answer in auditAnswers)
    {
        QuestionDefinition definition = FindDefinition(answer.questionId);
        if (definition == null || string.IsNullOrWhiteSpace(answer.userAnswer))
        {
            continue;
        }

        bool isCorrect = NormalizeOption(answer.userAnswer) == definition.correctAnswer;
        rows.Add(new DbAnswerPayload
        {
            user_id = scoreUserId,
            session_id = scoreSessionId,
            question_id = definition.dbQuestionId,
            selected_option = NormalizeOption(answer.userAnswer),
            is_correct = isCorrect ? 1 : 0,
            score = isCorrect ? 10 : 0
        });
    }

    return JsonConvert.SerializeObject(rows, Formatting.Indented);
}

public void ImportDatabaseAnswersJson(string json)
{
    if (string.IsNullOrWhiteSpace(json))
    {
        return;
    }

    try
    {
        List<DbAnswerPayload> rows = JsonConvert.DeserializeObject<List<DbAnswerPayload>>(json);
        if (rows == null)
        {
            return;
        }

        foreach (DbAnswerPayload row in rows)
        {
            RecordAuditAnswerByDatabaseId(row.question_id, row.selected_option);
        }
    }
    catch (System.Exception e)
    {
        Debug.LogError("ImportDatabaseAnswersJson 解析失敗：" + e.Message);
    }
}

public void ScoreDatabaseAnswersJson(string json)
{
    ImportDatabaseAnswersJson(json);
    ScoreCurrentAuditAnswers();
}

/// <summary>
/// 「查看成績 / 完成訓練」正式入口。
/// 不再拿 Unity 本地答案自己判分，也不讓 LLM 算分。
/// 流程：MySQL 本 Session 15 題 -> Node.js 固定公式 -> 寫 vr_training_records -> LLM 只產生文字回饋。
/// </summary>
public void ScoreCurrentAuditAnswers()
{
    if (isWaitingForScoreResponse)
    {
        Debug.LogWarning("目前正在處理成績，請稍等。");
        return;
    }

    TrySyncLoginContextFromUnityAnswerApi();

    if (scoreUserId <= 0 || scoreSessionId <= 0)
    {
        Debug.LogError($"❌ 無法評分：userId={scoreUserId}, sessionId={scoreSessionId}。請先完成 Web → VR 登入。");
        ShowNPCDialogue("尚未取得本次登入資訊，無法產生成績。");
        return;
    }

    if (string.IsNullOrWhiteSpace(completeSessionUrl))
    {
        Debug.LogError("尚未設定 completeSessionUrl。");
        ShowNPCDialogue("系統錯誤：尚未設定成績 API。");
        return;
    }

    StartCoroutine(CompleteSessionAndGetAuthoritativeScore());
}

/// <summary>
/// 舊 Demo 按鈕保留，避免 UnityEvent Missing Method；正式版不再注入假答案。
/// </summary>
public void LoadMockAuditAnswersForDemo()
{
    Debug.LogWarning("正式版已停用 Mock 15 題。請透過 UnityAnswerApi 將真實作答寫入 MySQL。");
    ShowNPCDialogue("正式版不使用模擬答案，請完成實際稽核題目。");
}

private bool TrySyncLoginContextFromUnityAnswerApi()
{
    // authController 不需要改。
    // 這裡只從既有 UnityAnswerApi 同步 userId、sessionId 與 Node.js 主機。
    try
    {
        MonoBehaviour[] behaviours = UnityEngine.Object.FindObjectsByType<MonoBehaviour>(FindObjectsSortMode.None);

        const System.Reflection.BindingFlags flags =
            System.Reflection.BindingFlags.Instance |
            System.Reflection.BindingFlags.Public |
            System.Reflection.BindingFlags.NonPublic;

        foreach (MonoBehaviour behaviour in behaviours)
        {
            if (behaviour == null || behaviour.GetType().Name != "UnityAnswerApi")
            {
                continue;
            }

            System.Type type = behaviour.GetType();

            int detectedUserId = ReadIntMember(
                behaviour,
                type,
                flags,
                new string[] { "userId", "UserId", "user_id" },
                new string[] { "GetUserId" }
            );

            int detectedSessionId = ReadIntMember(
                behaviour,
                type,
                flags,
                new string[] { "sessionId", "SessionId", "session_id" },
                new string[] { "GetSessionId" }
            );

            if (detectedUserId > 0)
            {
                scoreUserId = detectedUserId;
            }

            if (detectedSessionId > 0)
            {
                scoreSessionId = detectedSessionId;
            }

            if (autoSyncBackendUrlFromUnityAnswerApi)
            {
                string answerApiUrl = ReadUnityAnswerApiUrl(behaviour, type, flags);

                if (!string.IsNullOrWhiteSpace(answerApiUrl))
                {
                    ApplyCompleteSessionUrlFromAnswerApi(answerApiUrl);
                }
            }

            Debug.Log(
                $"🔗 OpenAIManager 已同步 UnityAnswerApi：" +
                $"userId={scoreUserId}, " +
                $"sessionId={scoreSessionId}, " +
                $"completeSessionUrl={completeSessionUrl}"
            );

            return scoreUserId > 0 && scoreSessionId > 0;
        }
    }
    catch (System.Exception e)
    {
        Debug.LogWarning("自動同步 UnityAnswerApi 失敗：" + e.Message);
    }

    return scoreUserId > 0 && scoreSessionId > 0;
}

private static int ReadIntMember(
    object target,
    System.Type type,
    System.Reflection.BindingFlags flags,
    string[] memberNames,
    string[] methodNames)
{
    foreach (string memberName in memberNames)
    {
        System.Reflection.FieldInfo field = type.GetField(memberName, flags);

        if (field != null)
        {
            try
            {
                return System.Convert.ToInt32(field.GetValue(target));
            }
            catch
            {
            }
        }

        System.Reflection.PropertyInfo property = type.GetProperty(memberName, flags);

        if (property != null && property.CanRead)
        {
            try
            {
                return System.Convert.ToInt32(property.GetValue(target, null));
            }
            catch
            {
            }
        }
    }

    foreach (string methodName in methodNames)
    {
        System.Reflection.MethodInfo method = type.GetMethod(
            methodName,
            flags,
            null,
            System.Type.EmptyTypes,
            null
        );

        if (method != null)
        {
            try
            {
                return System.Convert.ToInt32(method.Invoke(target, null));
            }
            catch
            {
            }
        }
    }

    return 0;
}

private static string ReadUnityAnswerApiUrl(
    object target,
    System.Type type,
    System.Reflection.BindingFlags flags)
{
    // 不綁死 UnityAnswerApi 的 URL 欄位名稱。
    // 只要其中任何 string 包含 /api/unity/answers，就拿它當作目前後端位址。
    foreach (System.Reflection.FieldInfo field in type.GetFields(flags))
    {
        if (field.FieldType != typeof(string))
        {
            continue;
        }

        try
        {
            string value = field.GetValue(target) as string;

            if (!string.IsNullOrWhiteSpace(value) &&
                value.IndexOf("/api/unity/answers", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return value.Trim();
            }
        }
        catch
        {
        }
    }

    foreach (System.Reflection.PropertyInfo property in type.GetProperties(flags))
    {
        if (property.PropertyType != typeof(string) || !property.CanRead)
        {
            continue;
        }

        try
        {
            string value = property.GetValue(target, null) as string;

            if (!string.IsNullOrWhiteSpace(value) &&
                value.IndexOf("/api/unity/answers", System.StringComparison.OrdinalIgnoreCase) >= 0)
            {
                return value.Trim();
            }
        }
        catch
        {
        }
    }

    return "";
}

private void ApplyCompleteSessionUrlFromAnswerApi(string answerApiUrl)
{
    if (string.IsNullOrWhiteSpace(answerApiUrl))
    {
        return;
    }

    System.Uri uri;

    if (!System.Uri.TryCreate(answerApiUrl.Trim(), System.UriKind.Absolute, out uri))
    {
        Debug.LogWarning("UnityAnswerApi URL 格式無法解析：" + answerApiUrl);
        return;
    }

    string baseUrl = uri.GetLeftPart(System.UriPartial.Authority).TrimEnd('/');
    completeSessionUrl = baseUrl + "/api/unity/complete-session";
}

/// <summary>
/// 可選：其他登入腳本如果想直接指定 Node.js 主機，可呼叫此方法。
/// 例如：http://192.168.100.147:3000 或 https://xxxx.ngrok-free.app
/// </summary>
public void SetBackendBaseUrl(string baseUrl)
{
    if (string.IsNullOrWhiteSpace(baseUrl))
    {
        return;
    }

    string value = baseUrl.Trim();

    if (value.IndexOf("/api/unity/answers", System.StringComparison.OrdinalIgnoreCase) >= 0)
    {
        ApplyCompleteSessionUrlFromAnswerApi(value);
        return;
    }

    System.Uri uri;

    if (!System.Uri.TryCreate(value, System.UriKind.Absolute, out uri))
    {
        Debug.LogWarning("SetBackendBaseUrl 收到無效網址：" + baseUrl);
        return;
    }

    completeSessionUrl =
        uri.GetLeftPart(System.UriPartial.Authority).TrimEnd('/') +
        "/api/unity/complete-session";

    Debug.Log("✅ OpenAIManager Node.js API：" + completeSessionUrl);
}

private IEnumerator CompleteSessionAndGetAuthoritativeScore()
{
    isWaitingForScoreResponse = true;
    ShowNPCDialogue("正在從資料庫整理本次稽核成績……");

    // 正式送出前再同步一次，確保 userId、sessionId、Node.js URL 都是最新值。
    TrySyncLoginContextFromUnityAnswerApi();

    CompleteSessionRequest requestData = new CompleteSessionRequest
    {
        userId = scoreUserId,
        sessionId = scoreSessionId,
        duration = trainingDurationHours,
        blocks = 0
    };

    string json = JsonConvert.SerializeObject(requestData);
    byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

    int maxAttempts = Mathf.Max(1, scoreRetryCount + 1);

    string lastResponseText = "";
    long lastResponseCode = 0;
    string lastRequestError = "";
    BackendScoreResponse lastParsedResponse = null;

    for (int attempt = 1; attempt <= maxAttempts; attempt++)
    {
        UnityWebRequest.Result requestResult = UnityWebRequest.Result.InProgress;
        string responseText = "";
        long responseCode = 0;
        string requestError = "";

        using (UnityWebRequest request = new UnityWebRequest(
            completeSessionUrl,
            UnityWebRequest.kHttpVerbPOST))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
            request.SetRequestHeader("Accept", "application/json");
            request.SetRequestHeader("ngrok-skip-browser-warning", "true");
            request.timeout = 30;

            Debug.Log(
                $"📤 完成本次 Session：" +
                $"userId={scoreUserId}, " +
                $"sessionId={scoreSessionId}, " +
                $"attempt={attempt}/{maxAttempts}, " +
                $"url={completeSessionUrl}"
            );

            yield return request.SendWebRequest();

            requestResult = request.result;
            responseCode = request.responseCode;
            requestError = request.error;
            responseText = request.downloadHandler != null
                ? request.downloadHandler.text
                : "";
        }

        lastResponseText = responseText;
        lastResponseCode = responseCode;
        lastRequestError = requestError;
        lastParsedResponse = ParseBackendScoreResponse(responseText);

        // authController 若已在第 15 題自動完成 Session 也沒關係；
        // /complete-session 對已完成 Session 仍會回傳本次權威成績。
        if (requestResult == UnityWebRequest.Result.Success &&
            lastParsedResponse != null &&
            lastParsedResponse.success &&
            lastParsedResponse.data != null)
        {
            HandleAuthoritativeScore(lastParsedResponse.data);
            yield break;
        }

        // 最後一題剛送出時，可能 complete-session 比 user_answers 寫入更早抵達。
        // 後端回 409 時由 LLM 端稍候後重試，不必修改 authController。
        if (responseCode == 409 && attempt < maxAttempts)
        {
            int answeredCount =
                lastParsedResponse != null && lastParsedResponse.progress != null
                    ? lastParsedResponse.progress.answeredCount
                    : -1;

            if (answeredCount >= 0)
            {
                ShowNPCDialogue($"正在同步最後作答：{answeredCount}/15……");
            }
            else
            {
                ShowNPCDialogue("正在同步最後作答……");
            }

            Debug.LogWarning(
                $"⏳ complete-session 回傳 409，等待 " +
                $"{scoreRetryDelaySeconds:0.00} 秒後重試。"
            );

            yield return new WaitForSeconds(
                Mathf.Max(0.1f, scoreRetryDelaySeconds)
            );

            continue;
        }

        break;
    }

    isWaitingForScoreResponse = false;

    Debug.LogError(
        "❌ 後端最終評分失敗。" +
        "HTTP=" + lastResponseCode +
        ", error=" + lastRequestError +
        ", url=" + completeSessionUrl
    );

    Debug.LogError(lastResponseText);

    if (lastParsedResponse != null &&
        lastResponseCode == 409 &&
        lastParsedResponse.progress != null)
    {
        ShowNPCDialogue(
            $"尚未完成全部題目：" +
            $"{lastParsedResponse.progress.answeredCount}/15。"
        );
    }
    else if (lastParsedResponse != null &&
             !string.IsNullOrWhiteSpace(lastParsedResponse.message))
    {
        ShowNPCDialogue(lastParsedResponse.message);
    }
    else if (lastResponseCode == 0)
    {
        ShowNPCDialogue(
            "無法連線到 Node.js 後端，請確認 UnityAnswerApi 的 API 網址與伺服器是否已啟動。"
        );
    }
    else
    {
        ShowNPCDialogue("系統錯誤：無法取得本次成績。");
    }
}

private BackendScoreResponse ParseBackendScoreResponse(string responseText)
{
    if (string.IsNullOrWhiteSpace(responseText))
    {
        return null;
    }

    try
    {
        return JsonConvert.DeserializeObject<BackendScoreResponse>(responseText);
    }
    catch (System.Exception e)
    {
        Debug.LogWarning("解析後端成績 JSON 失敗：" + e.Message);
        Debug.LogWarning(responseText);
        return null;
    }
}

private void HandleAuthoritativeScore(ScoreResult scoreResult)
{
    if (scoreResult == null)
    {
        isWaitingForScoreResponse = false;
        ShowNPCDialogue("系統錯誤：沒有取得有效成績。");
        return;
    }

    scoreResult.userName = string.IsNullOrWhiteSpace(scoreUserName)
        ? "使用者"
        : scoreUserName.Trim();

    lastScoreResult = scoreResult;

    Debug.Log("<color=green>✅ Node.js / MySQL 權威成績：</color>");
    Debug.Log(JsonConvert.SerializeObject(scoreResult, Formatting.Indented));

    isWaitingForScoreResponse = false;

    // 數字分數完全沿用 Node.js / MySQL；LLM 只寫 summary / suggestion。
    if (useLlmForSummary && !string.IsNullOrWhiteSpace(apiKey))
    {
        StartCoroutine(PostScoreSummaryToOpenAI(scoreResult));
    }
    else
    {
        FinalizeScoreResult(scoreResult);
    }
}

private IEnumerator PostScoreSummaryToOpenAI(ScoreResult fixedResult)
{
    isWaitingForScoreResponse = true;
    ShowNPCDialogue("成績已確認，正在產生個人化學習建議……");

    // 只把後端已確認的結果交給 LLM。LLM 完全沒有修改分數的權限。
    string fixedScoreJson = JsonConvert.SerializeObject(fixedResult);

    string systemPrompt =
        "你是 VR 資安稽核訓練系統的學習回饋助手。" +
        "所有數字、答對答錯、正確答案、雷達分數與 totalScore 都已由 Node.js/MySQL 固定規則確認。" +
        "你絕對不可重新計算、修改、補猜或推翻任何分數與 isCorrect。" +
        "你只能根據已提供的 radar 與答錯 items 撰寫繁體中文的 summary 與 suggestion。" +
        "不要捏造未提供的 ISO 條文；建議要具體指出應改善的行為。" +
        "summary 80 字內，suggestion 120 字內。" +
        "只能回傳合法 JSON，格式固定為：{\"summary\":\"...\",\"suggestion\":\"...\"}";

    string userPrompt =
        "以下是後端已鎖定的最終成績。請勿回傳任何新的分數，只產生文字回饋：\n" +
        fixedScoreJson;

    PostData data = new PostData
    {
        model = modelName,
        response_format = new ResponseFormat { type = "json_object" },
        messages = new List<Message>
        {
            new Message { role = "system", content = systemPrompt },
            new Message { role = "user", content = userPrompt }
        }
    };

    string json = JsonConvert.SerializeObject(data);

    using (UnityWebRequest request = new UnityWebRequest(apiUrl, UnityWebRequest.kHttpVerbPOST))
    {
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json; charset=utf-8");
        request.SetRequestHeader("Authorization", "Bearer " + apiKey);
        request.timeout = 60;

        yield return request.SendWebRequest();
        isWaitingForScoreResponse = false;

        if (request.result == UnityWebRequest.Result.Success)
        {
            ApplyLlmNarrativeAndFinalize(fixedResult, request.downloadHandler.text);
        }
        else
        {
            Debug.LogWarning("LLM 回饋產生失敗；數字成績已由後端完成，不受影響。" + request.error);
            Debug.LogWarning(request.downloadHandler != null ? request.downloadHandler.text : "");
            FinalizeScoreResult(fixedResult);
        }
    }
}

private void ApplyLlmNarrativeAndFinalize(ScoreResult fixedResult, string responseText)
{
    try
    {
        OpenAIResponse response = JsonConvert.DeserializeObject<OpenAIResponse>(responseText);

        if (response != null &&
            response.choices != null &&
            response.choices.Count > 0 &&
            response.choices[0].message != null)
        {
            ScoreNarrativeResult narrative =
                JsonConvert.DeserializeObject<ScoreNarrativeResult>(response.choices[0].message.content);

            if (narrative != null)
            {
                if (!string.IsNullOrWhiteSpace(narrative.summary))
                {
                    fixedResult.summary = narrative.summary.Trim();
                }

                if (!string.IsNullOrWhiteSpace(narrative.suggestion))
                {
                    fixedResult.suggestion = narrative.suggestion.Trim();
                }
            }
        }
    }
    catch (System.Exception e)
    {
        Debug.LogWarning("解析 LLM 學習回饋失敗，沿用後端預設回饋：" + e.Message);
    }

    // 注意：只覆蓋 summary/suggestion，任何分數都不會從 LLM 回寫。
    FinalizeScoreResult(fixedResult);
}

private void FinalizeScoreResult(ScoreResult scoreResult)
{
    lastScoreResult = scoreResult;

    Debug.Log("<color=green>🎯 最終成績（數字由 Node.js/MySQL 決定）：</color>");
    Debug.Log(JsonConvert.SerializeObject(scoreResult, Formatting.Indented));

    // =========================================
    // 新增：把 LLM 最終 summary / suggestion
    // 儲存回 Node.js / MySQL。
    //
    // 如果 LLM 呼叫失敗，這裡仍會把後端預設文字存回去，
    // 因此網站每次完成訓練都能讀到本次最新文字回饋。
    // =========================================
    if (scoreResult != null)
    {
        if (scoreResult.userId <= 0)
        {
            scoreResult.userId = scoreUserId;
        }

        if (scoreResult.sessionId <= 0)
        {
            scoreResult.sessionId = scoreSessionId;
        }

        if (scoreResult.userId > 0 &&
            scoreResult.sessionId > 0 &&
            (!string.IsNullOrWhiteSpace(scoreResult.summary) ||
             !string.IsNullOrWhiteSpace(scoreResult.suggestion)))
        {
            StartCoroutine(
                SaveAiFeedbackToBackend(scoreResult)
            );
        }
        else
        {
            Debug.LogWarning(
                "⚠️ AI 回饋未送出：缺少 userId/sessionId 或 summary/suggestion。"
            );
        }
    }

    if (showScoreSummaryOnDialogue)
    {
        ShowNPCDialogue(
            "評分完成。總分：" + scoreResult.totalScore +
            "，等級：" + scoreResult.level + "。" +
            (scoreResult.summary ?? "")
        );
    }
}


// ============================================================
// 由 completeSessionUrl 自動推導 AI 回饋 API。
//
// 例如：
// http://192.168.100.147:3000/api/unity/complete-session
//
// 會自動變成：
// http://192.168.100.147:3000/api/unity/save-ai-feedback
// ============================================================
private string GetSaveAiFeedbackUrl()
{
    if (string.IsNullOrWhiteSpace(completeSessionUrl))
    {
        return "";
    }

    System.Uri uri;

    if (!System.Uri.TryCreate(
            completeSessionUrl.Trim(),
            System.UriKind.Absolute,
            out uri))
    {
        return "";
    }

    return
        uri.GetLeftPart(System.UriPartial.Authority)
            .TrimEnd('/') +
        "/api/unity/save-ai-feedback";
}


// ============================================================
// 將本次 LLM 產生的文字回饋寫回 Node.js / MySQL。
// 分數不會從這裡送回，也不會被 LLM 修改。
// ============================================================
private IEnumerator SaveAiFeedbackToBackend(
    ScoreResult scoreResult
)
{
    string saveUrl =
        GetSaveAiFeedbackUrl();

    if (string.IsNullOrWhiteSpace(saveUrl))
    {
        Debug.LogWarning(
            "⚠️ 無法產生 save-ai-feedback URL。completeSessionUrl=" +
            completeSessionUrl
        );

        yield break;
    }

    AIFeedbackSaveRequest payload =
        new AIFeedbackSaveRequest
        {
            userId =
                scoreResult.userId > 0
                    ? scoreResult.userId
                    : scoreUserId,

            sessionId =
                scoreResult.sessionId > 0
                    ? scoreResult.sessionId
                    : scoreSessionId,

            summary =
                scoreResult.summary ?? "",

            suggestion =
                scoreResult.suggestion ?? ""
        };

    string json =
        JsonConvert.SerializeObject(
            payload
        );

    byte[] bodyRaw =
        Encoding.UTF8.GetBytes(
            json
        );

    using (
        UnityWebRequest request =
            new UnityWebRequest(
                saveUrl,
                UnityWebRequest.kHttpVerbPOST
            )
    )
    {
        request.uploadHandler =
            new UploadHandlerRaw(
                bodyRaw
            );

        request.downloadHandler =
            new DownloadHandlerBuffer();

        request.SetRequestHeader(
            "Content-Type",
            "application/json; charset=utf-8"
        );

        request.SetRequestHeader(
            "Accept",
            "application/json"
        );

        request.SetRequestHeader(
            "ngrok-skip-browser-warning",
            "true"
        );

        request.timeout =
            30;

        Debug.Log(
            $"📤 儲存 AI 回饋：" +
            $"userId={payload.userId}, " +
            $"sessionId={payload.sessionId}, " +
            $"url={saveUrl}"
        );

        yield return
            request.SendWebRequest();

        string responseText =
            request.downloadHandler != null
                ? request.downloadHandler.text
                : "";

        if (
            request.result ==
            UnityWebRequest.Result.Success
        )
        {
            Debug.Log(
                "<color=green>" +
                "✅ AI 總評 / 學習建議已成功寫回 Node.js / MySQL。" +
                "</color>"
            );

            if (!string.IsNullOrWhiteSpace(responseText))
            {
                Debug.Log(responseText);
            }
        }
        else
        {
            Debug.LogError(
                "❌ 儲存 AI 回饋失敗。" +
                " HTTP=" +
                request.responseCode +
                ", error=" +
                request.error
            );

            Debug.LogError(
                responseText
            );
        }
    }
}

private static QuestionDefinition FindDefinition(string questionIdOrCode)
{
    if (string.IsNullOrWhiteSpace(questionIdOrCode))
    {
        return null;
    }

    string value = questionIdOrCode.Trim();

    foreach (QuestionDefinition definition in FormalQuestions)
    {
        if (string.Equals(definition.code, value, System.StringComparison.OrdinalIgnoreCase))
        {
            return definition;
        }
    }

    int numericId;
    if (int.TryParse(value, out numericId))
    {
        return FindDefinitionByDbId(numericId);
    }

    if (value.StartsWith("Q", System.StringComparison.OrdinalIgnoreCase) &&
        int.TryParse(value.Substring(1), out numericId))
    {
        return FindDefinitionByDbId(numericId);
    }

    return null;
}

private static QuestionDefinition FindDefinitionByDbId(int dbQuestionId)
{
    foreach (QuestionDefinition definition in FormalQuestions)
    {
        if (definition.dbQuestionId == dbQuestionId)
        {
            return definition;
        }
    }

    return null;
}

private static string NormalizeOption(string option)
{
    if (string.IsNullOrWhiteSpace(option))
    {
        return "";
    }

    string value = option.Trim().ToUpperInvariant();

    if (value == "YES" || value == "TRUE" || value == "是" || value == "○") return "O";
    if (value == "NO" || value == "FALSE" || value == "否" || value == "×") return "X";
    if (value == "COMPLETE" || value == "COMPLETED" || value == "DONE" || value == "完成") return "C";

    return value;
}

private static int ParseIntOrZero(string value)
{
    int result;
    return int.TryParse(value, out result) ? result : 0;
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
        "回覆請控制在 20個字以內。" +
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