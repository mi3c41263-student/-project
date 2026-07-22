using TMPro;
using UnityEngine;

public class DefectQuestionController : MonoBehaviour
{
    [Header("3D 問答框整體物件，請拖 QuestionRoot")]
    [SerializeField] private GameObject questionRoot;

    [Header("這個支線的完成度物件")]
    [SerializeField] private MissionTarget missionTarget;

    [Header("正確答案是否為「是」")]
    [SerializeField] private bool correctAnswerIsYes = true;

    [Header("答對後是否自動關閉問答框")]
    [SerializeField] private bool hideAfterCorrect = false;

    [Header("答錯後是否自動關閉問答框")]
    [SerializeField] private bool hideAfterWrong = false;

    [Header("答對後是否只能完成一次")]
    [SerializeField] private bool completeOnlyOnce = true;

    [Header("作答提示文字，可不填")]
    [SerializeField] private TMP_Text answerFeedbackText;

    [Header("點 O 時顯示的文字")]
    [SerializeField] private string yesFeedbackMessage = "已選擇：O";

    [Header("點 X 時顯示的文字")]
    [SerializeField] private string noFeedbackMessage = "已選擇：X";

    [Header("是否顯示正確 / 錯誤結果")]
    [SerializeField] private bool showCorrectWrongResult = true;

    private bool completed;

    private void Awake()
    {
        if (missionTarget == null)
        {
            missionTarget = GetComponent<MissionTarget>();
        }

        ClearFeedback();

        if (questionRoot != null)
        {
            questionRoot.SetActive(false);
        }
    }

    /// <summary>
    /// 給支線物件的 XR Simple Interactable → Activated 呼叫。
    /// 再次點同一個支線物件時，切換問答框顯示 / 隱藏。
    /// </summary>
    public void OpenQuestion()
    {
        ToggleQuestion();
    }

    public void ToggleQuestion()
    {
        if (questionRoot == null)
        {
            Debug.LogWarning($"{gameObject.name} 尚未指定 Question Root。", this);
            return;
        }

        bool nextState = !questionRoot.activeSelf;
        questionRoot.SetActive(nextState);

        // 每次重新打開問答框時，先清空上一次的作答提示。
        if (nextState)
        {
            ClearFeedback();
        }

        Debug.Log($"{gameObject.name} 問答框切換為：{nextState}", this);
    }

    public void ShowQuestion()
    {
        if (questionRoot == null)
        {
            Debug.LogWarning($"{gameObject.name} 尚未指定 Question Root。", this);
            return;
        }

        questionRoot.SetActive(true);
        ClearFeedback();
    }

    public void CloseQuestion()
    {
        if (questionRoot != null)
        {
            questionRoot.SetActive(false);
        }
    }

    /// <summary>
    /// 給「O / 是」按鈕呼叫。
    /// </summary>
    public void AnswerYes()
    {
        CheckAnswer(true);
    }

    /// <summary>
    /// 給「X / 不是」按鈕呼叫。
    /// </summary>
    public void AnswerNo()
    {
        CheckAnswer(false);
    }

    private void CheckAnswer(bool playerAnswerIsYes)
    {
        bool isCorrect = playerAnswerIsYes == correctAnswerIsYes;

        ShowAnswerFeedback(playerAnswerIsYes, isCorrect);

        if (isCorrect)
        {
            Debug.Log($"{gameObject.name}：判斷正確，已紀錄為缺失。", this);

            CompleteMission();

            if (hideAfterCorrect)
            {
                CloseQuestion();
            }
        }
        else
        {
            Debug.Log($"{gameObject.name}：判斷錯誤。", this);

            if (hideAfterWrong)
            {
                CloseQuestion();
            }
        }
    }

    private void ShowAnswerFeedback(bool playerAnswerIsYes, bool isCorrect)
    {
        if (answerFeedbackText == null)
        {
            return;
        }

        string selectedMessage = playerAnswerIsYes
            ? yesFeedbackMessage
            : noFeedbackMessage;

        if (showCorrectWrongResult)
        {
            string resultMessage = isCorrect ? "，判斷正確" : "，判斷錯誤";
            answerFeedbackText.text = selectedMessage + resultMessage;
        }
        else
        {
            answerFeedbackText.text = selectedMessage;
        }
    }

    private void ClearFeedback()
    {
        if (answerFeedbackText != null)
        {
            answerFeedbackText.text = "";
        }
    }

    private void CompleteMission()
    {
        if (completeOnlyOnce && completed)
        {
            Debug.Log($"{gameObject.name} 已經完成過，不重複增加完成度。", this);
            return;
        }

        completed = true;

        if (missionTarget != null)
        {
            missionTarget.Complete();
        }
        else
        {
            Debug.LogWarning($"{gameObject.name} 尚未指定 MissionTarget，無法更新完成度。", this);
        }
    }

    public void ResetQuestion()
    {
        completed = false;
        ClearFeedback();

        if (questionRoot != null)
        {
            questionRoot.SetActive(false);
        }
    }
}