using UnityEngine;

/// <summary>
/// 不改原本 DefectQuestionController 的橋接腳本。
/// 把這支掛在每一個支線物件或 QuestionRoot 上，
/// 然後在 Yes / No 按鈕的 On Click 事件各多加一行 RecordYes / RecordNo，
/// 就能把玩家 O / X 作答送進 OpenAIManager。
/// </summary>
public class DefectQuestionLLMRecorder : MonoBehaviour
{
    [Header("OpenAIManager")]
    [Tooltip("拖入場景中的 LLM / OpenAIManager 物件。若沒拖，會自動嘗試尋找。")]
    public OpenAIManager openAIManager;

    [Header("題目資料")]
    public string questionId = "Q01";
    public string questionName = "題目名稱";
    public string isoClause = "ISO 條文";

    [Header("正確答案")]
    [Tooltip("正確答案是 O / 是，就勾選；正確答案是 X / 否，就不要勾。")]
    public bool correctAnswerIsYes = true;

    [Header("記錄設定")]
    [Tooltip("勾選後，同一題第一次作答後就不再覆蓋答案。若玩家可以修改答案，請不要勾。")]
    public bool recordOnlyOnce = false;

    [Header("Debug 狀態，只讀")]
    [SerializeField] private bool hasRecorded = false;
    [SerializeField] private string lastUserAnswer = "";

    public void RecordYes()
    {
        RecordAnswer(true);
    }

    public void RecordNo()
    {
        RecordAnswer(false);
    }

    public void RecordO()
    {
        RecordYes();
    }

    public void RecordX()
    {
        RecordNo();
    }

    private void RecordAnswer(bool userAnswerIsYes)
    {
        if (recordOnlyOnce && hasRecorded)
        {
            Debug.Log($"{questionId} 已記錄過答案，因 recordOnlyOnce=true，本次不覆蓋。", this);
            return;
        }

        if (openAIManager == null)
        {
#if UNITY_2023_1_OR_NEWER
            openAIManager = Object.FindFirstObjectByType<OpenAIManager>();
#else
            openAIManager = Object.FindObjectOfType<OpenAIManager>();
#endif
        }

        if (openAIManager == null)
        {
            Debug.LogWarning("找不到 OpenAIManager，無法記錄 LLM 評分答案。", this);
            return;
        }

        lastUserAnswer = userAnswerIsYes ? "O" : "X";

        string finalQuestionName = string.IsNullOrEmpty(questionName)
            ? gameObject.name
            : questionName;

        string userAnswer = userAnswerIsYes ? "O" : "X";
        string correctAnswer = correctAnswerIsYes ? "O" : "X";

        openAIManager.RecordAuditAnswer(
            questionId,
            finalQuestionName,
            userAnswer,
            correctAnswer,
            isoClause
        );

        hasRecorded = true;

        Debug.Log($"LLM 答案已送入 OpenAIManager：{questionId} / {finalQuestionName} = {userAnswer}，正確答案 = {correctAnswer}", this);
    }

    public void ResetRecordedState()
    {
        hasRecorded = false;
        lastUserAnswer = "";
    }
}