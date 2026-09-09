using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class UnityAnswerApi : MonoBehaviour
{
    public static UnityAnswerApi Instance { get; private set; }


    // =========================================
    // Node.js API
    // =========================================
    [Header("Node.js API")]
    [SerializeField]
    private string apiUrl =
        "http://192.168.100.147:3000/api/unity/answers";


    // =========================================
    // 目前登入使用者
    //
    // 正式版登入成功後，
    // VRCodeLoginManager 會自動設定。
    // =========================================
    [Header("目前 VR 使用者")]
    [SerializeField]
    private int userId = 0;


    // =========================================
    // 本次 VR Session
    //
    // 每一次 VR 體驗都會有新的 sessionId。
    // =========================================
    [Header("目前 VR Session")]
    [SerializeField]
    private int sessionId = 0;


    // =========================================
    // 15 題完成後自動觸發最終 LLM 回饋
    // =========================================
    [Header("自動最終評分")]
    [SerializeField]
    private bool autoFinalizeWhenAllAnswersCompleted = true;

    [SerializeField]
    [Tooltip("最後一題成功寫入後，等待多久再觸發 OpenAIManager 最終評分。") ]
    private float autoFinalizeDelaySeconds = 0.35f;

    private int lastAutoFinalizedSessionId = -1;
    private bool isAutoFinalizing = false;


    // =========================================
    // Unity → Node.js
    // =========================================
    [Serializable]
    private class AnswerRequest
    {
        public int userId;

        public int sessionId;

        public string questionCode;

        public string selectedOption;
    }


    // =========================================
    // Node.js → Unity
    // =========================================
    [Serializable]
    public class AnswerResponse
    {
        public bool success;

        public string message;

        public AnswerData data;
    }


    [Serializable]
    public class AnswerData
    {
        // =====================================
        // 本題資料
        // =====================================
        public int answerId;

        public int userId;

        // 後端回傳本次 training_sessions.id。
        public int sessionId;

        public int questionId;

        public string questionCode;

        public int stageNo;

        public string interactionType;

        public string questionText;

        public string selectedOption;

        public string correctOption;

        public bool isCorrect;

        public int score;


        // =====================================
        // 後端回傳完成度
        // =====================================
        public int stage1Completed;

        public int stage2Completed;

        public int stage3Completed;

        public int currentStageCompleted;

        public int stageTotal;

        public int totalCompleted;

        public int totalQuestions;
    }


    // =========================================
    // Awake
    // =========================================
    private void Awake()
    {
        if (
            Instance != null &&
            Instance != this
        )
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;

        Debug.Log(
            "✅ UnityAnswerApi 已啟動"
        );
    }


    // =========================================
    // 所有正式支線呼叫這裡
    //
    // 例如：
    //
    // SendAnswer(
    //     AuditQuestionKey.UsbDrive,
    //     "X"
    // );
    // =========================================
    public void SendAnswer(
        AuditQuestionKey questionKey,
        string selectedOption,
        Action<AnswerResponse> onCompleted = null)
    {
        // =====================================
        // 必須先完成 Web → VR 登入
        // =====================================
        if (
            userId <= 0 ||
            sessionId <= 0
        )
        {
            Debug.LogError(
                "❌ 尚未完成 VR 登入，不能送出支線作答"
            );

            return;
        }


        // =====================================
        // QuestionKey → question_code
        // =====================================
        string questionCode =
            AuditQuestionCode.GetCode(
                questionKey
            );


        if (
            string.IsNullOrWhiteSpace(
                questionCode
            )
        )
        {
            Debug.LogError(
                "❌ 找不到 Question Code：" +
                questionKey
            );

            return;
        }


        // =====================================
        // 統一答案格式
        // =====================================
        string option =
            selectedOption
                .Trim()
                .ToUpper();


        if (
            option != "O" &&
            option != "X" &&
            option != "C"
        )
        {
            Debug.LogError(
                "❌ selectedOption 只能是 O、X 或 C"
            );

            return;
        }


        // =====================================
        // 送出
        // =====================================
        StartCoroutine(
            SendAnswerCoroutine(
                questionCode,
                option,
                onCompleted
            )
        );
    }


    // =========================================
    // HTTP POST
    // =========================================
    private IEnumerator SendAnswerCoroutine(
        string questionCode,
        string selectedOption,
        Action<AnswerResponse> onCompleted)
    {
        // =====================================
        // Unity → Node.js JSON
        // =====================================
        AnswerRequest requestData =
            new AnswerRequest
            {
                userId =
                    userId,

                sessionId =
                    sessionId,

                questionCode =
                    questionCode,

                selectedOption =
                    selectedOption
            };


        string json =
            JsonUtility.ToJson(
                requestData
            );


        Debug.Log(
            "===================================="
        );

        Debug.Log(
            "📤 Unity → Node.js"
        );

        Debug.Log(
            json
        );


        byte[] bodyRaw =
            Encoding.UTF8.GetBytes(
                json
            );


        using (
            UnityWebRequest request =
                new UnityWebRequest(
                    apiUrl,
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
                "application/json"
            );


            request.timeout =
                10;


            yield return
                request.SendWebRequest();


            // =====================================
            // 成功
            // =====================================
            if (
                request.result ==
                UnityWebRequest.Result.Success
            )
            {
                string responseText =
                    request
                        .downloadHandler
                        .text;


                Debug.Log(
                    "📥 Node.js → Unity"
                );

                Debug.Log(
                    responseText
                );


                AnswerResponse result =
                    JsonUtility
                        .FromJson<AnswerResponse>(
                            responseText
                        );


                if (
                    result != null &&
                    result.success &&
                    result.data != null
                )
                {
                    Debug.Log(
                        "===================================="
                    );

                    Debug.Log(
                        $"支線：{result.data.questionCode}"
                    );

                    Debug.Log(
                        $"玩家答案：{result.data.selectedOption}"
                    );

                    Debug.Log(
                        $"正確答案：{result.data.correctOption}"
                    );

                    Debug.Log(
                        result.data.isCorrect
                            ? "✅ 答對"
                            : "❌ 答錯"
                    );

                    Debug.Log(
                        $"得分：{result.data.score}"
                    );


                    // =================================
                    // 後端完成度
                    // =================================
                    Debug.Log(
                        $"📊 第一站：{result.data.stage1Completed}/5"
                    );

                    Debug.Log(
                        $"📊 第二站：{result.data.stage2Completed}/5"
                    );

                    Debug.Log(
                        $"📊 第三站：{result.data.stage3Completed}/5"
                    );

                    Debug.Log(
                        $"📊 總完成度：{result.data.totalCompleted}/{result.data.totalQuestions}"
                    );

                    Debug.Log(
                        "===================================="
                    );


                    // =================================
                    // ★ 15/15 完成後自動觸發 OpenAIManager
                    //
                    // 這裡是在 /api/unity/answers 已經成功回應之後才觸發，
                    // 所以最後一題已確定寫進 MySQL，不會再發生 14/15 race condition。
                    // =================================
                    if (
                        autoFinalizeWhenAllAnswersCompleted &&
                        result.data.totalQuestions > 0 &&
                        result.data.totalCompleted >= result.data.totalQuestions
                    )
                    {
                        int completedSessionId =
                            result.data.sessionId > 0
                                ? result.data.sessionId
                                : sessionId;

                        if (
                            completedSessionId > 0 &&
                            completedSessionId != lastAutoFinalizedSessionId &&
                            !isAutoFinalizing
                        )
                        {
                            StartCoroutine(
                                TriggerOpenAIFinalScoreAfterLastAnswer(
                                    completedSessionId
                                )
                            );
                        }
                    }
                }


                // =====================================
                // 回傳給 AuditAnswerBridge
                // =====================================
                onCompleted?.Invoke(
                    result
                );
            }

            // =====================================
            // 失敗
            // =====================================
            else
            {
                Debug.LogError(
                    "❌ Unity → Node.js 失敗"
                );

                Debug.LogError(
                    "HTTP：" +
                    request.responseCode
                );

                Debug.LogError(
                    request
                        .downloadHandler
                        .text
                );
            }
        }
    }


    // =========================================
    // 最後一題成功寫入 MySQL 後，
    // 自動要求 OpenAIManager：
    // 1. 從 Node.js 取得本 Session 權威成績
    // 2. 產生 LLM summary / suggestion
    // 3. POST /api/unity/save-ai-feedback
    //
    // authController 不需要再修改。
    // =========================================
    private IEnumerator TriggerOpenAIFinalScoreAfterLastAnswer(
        int completedSessionId)
    {
        if (
            completedSessionId <= 0 ||
            completedSessionId == lastAutoFinalizedSessionId ||
            isAutoFinalizing
        )
        {
            yield break;
        }

        isAutoFinalizing = true;

        yield return new WaitForSeconds(
            Mathf.Max(0.05f, autoFinalizeDelaySeconds)
        );

        OpenAIManager manager =
            UnityEngine.Object.FindFirstObjectByType<OpenAIManager>();

        if (manager == null)
        {
            Debug.LogError(
                "❌ 15/15 已完成，但場景中找不到 OpenAIManager，" +
                "因此無法產生並儲存 AI 總評。"
            );

            isAutoFinalizing = false;
            yield break;
        }

        // 先標記，避免最後一題物件重複 Callback 時再次觸發。
        lastAutoFinalizedSessionId = completedSessionId;

        Debug.Log(
            $"🤖 15/15 完成，自動觸發最終 LLM 評分：sessionId={completedSessionId}"
        );

        manager.SetLoggedInUser(
            userId,
            "使用者",
            completedSessionId
        );

        manager.ScoreCurrentAuditAnswers();

        isAutoFinalizing = false;
    }


    // =========================================
    // Web → VR 登入成功後設定 User
    // =========================================
    public void SetUserId(
        int newUserId)
    {
        userId =
            newUserId;


        Debug.Log(
            "✅ 目前 Unity 使用者 ID：" +
            userId
        );
    }


    // =========================================
    // Web → VR 登入成功後設定 Session
    //
    // ★ 只能有這一個 SetSessionId()
    // =========================================
    public void SetSessionId(
        int newSessionId)
    {
        sessionId =
            newSessionId;

        // 新的一局允許再次自動產生 AI 回饋。
        lastAutoFinalizedSessionId = -1;
        isAutoFinalizing = false;


        Debug.Log(
            "✅ 目前 Unity Session ID：" +
            sessionId
        );
    }


    // =========================================
    // Getter
    // =========================================
    public int GetUserId()
    {
        return userId;
    }


    public int GetSessionId()
    {
        return sessionId;
    }
}