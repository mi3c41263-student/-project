using System.Collections;
using TMPro;
using UnityEngine;

public class DefectQuestionController : MonoBehaviour
{
    [Header("3D 問答框整體物件")]
    public GameObject questionRoot;

    [Header("這個支線的完成度物件")]
    public MissionTarget missionTarget;

    [Header("流程管理器，可不填，會自動尋找")]
    public AuditStageFlowManager flowManager;

    [Header("正確答案是否為 O / 是")]
    public bool correctAnswerIsYes = true;

    [Header("是否答題後就算完成支線")]
    public bool completeMissionWhenAnswered = true;

    [Header("是否只有答對才完成支線")]
    public bool completeOnlyWhenCorrect = false;

    [Header("回答後自動關閉問答框")]
    public bool hideAfterAnswer = true;

    [Header("回答後幾秒關閉")]
    public float hideDelay = 2f;

    [Header("顯示已選擇文字，可不填")]
    public TMP_Text answerFeedbackText;

    [Header("O 按鈕 Renderer，可不填")]
    public Renderer yesButtonRenderer;

    [Header("X 按鈕 Renderer，可不填")]
    public Renderer noButtonRenderer;

    [Header("一般材質，可不填")]
    public Material normalMaterial;

    [Header("選取後材質，可不填")]
    public Material selectedMaterial;

    private bool hasAnswered = false;
    private bool lastAnswerIsYes = false;
    private bool missionCompleted = false;
    private Coroutine hideCoroutine;

    private void Awake()
    {
        if (missionTarget == null)
        {
            missionTarget = GetComponent<MissionTarget>();
        }

        if (flowManager == null)
        {
            flowManager = FindFirstObjectByType<AuditStageFlowManager>();
        }

        HideQuestionRoot();
        RefreshAnswerVisual();
    }

    public void ToggleQuestion()
    {
        if (questionRoot == null)
        {
            Debug.LogWarning($"{gameObject.name} 尚未指定 Question Root。", this);
            return;
        }

        bool nextVisible = !questionRoot.activeSelf;

        if (nextVisible)
        {
            ShowQuestion();
        }
        else
        {
            HideQuestionRoot();
        }
    }

    public void ShowQuestion()
    {
        if (questionRoot != null)
        {
            questionRoot.SetActive(true);
        }

        RefreshAnswerVisual();
    }

    public void HideQuestionRoot()
    {
        if (questionRoot != null)
        {
            questionRoot.SetActive(false);
        }
    }

    public void AnswerYes()
    {
        SelectAnswer(true);
    }

    public void AnswerNo()
    {
        SelectAnswer(false);
    }

    // 給不同命名事件相容用
    public void AnswerO() { SelectAnswer(true); }
    public void AnswerX() { SelectAnswer(false); }
    public void SelectYes() { SelectAnswer(true); }
    public void SelectNo() { SelectAnswer(false); }
    public void OnYesClicked() { SelectAnswer(true); }
    public void OnNoClicked() { SelectAnswer(false); }

    private void SelectAnswer(bool isYes)
    {
        hasAnswered = true;
        lastAnswerIsYes = isYes;

        bool isCorrect = lastAnswerIsYes == correctAnswerIsYes;

        Debug.Log($"{gameObject.name} 問答框切換為：{lastAnswerIsYes}，是否正確：{isCorrect}", this);

        RefreshAnswerVisual();

        if (completeMissionWhenAnswered && !missionCompleted)
        {
            if (!completeOnlyWhenCorrect || isCorrect)
            {
                CompleteMissionOnce();
            }
        }

        if (hideAfterAnswer)
        {
            if (hideCoroutine != null)
            {
                StopCoroutine(hideCoroutine);
            }

            hideCoroutine = StartCoroutine(HideAfterDelayRoutine());
        }
    }

    private void CompleteMissionOnce()
    {
        if (missionCompleted)
        {
            return;
        }

        if (flowManager == null)
        {
            Debug.LogWarning($"{gameObject.name} 找不到 AuditStageFlowManager，無法登記完成。", this);
            return;
        }

        if (missionTarget == null)
        {
            Debug.LogWarning($"{gameObject.name} 找不到 MissionTarget，無法登記完成。", this);
            return;
        }

        missionCompleted = true;
        flowManager.RegisterMissionComplete(missionTarget);
    }

    private IEnumerator HideAfterDelayRoutine()
    {
        yield return new WaitForSeconds(hideDelay);
        HideQuestionRoot();
        hideCoroutine = null;
    }

    private void RefreshAnswerVisual()
    {
        if (answerFeedbackText != null)
        {
            if (hasAnswered)
            {
                answerFeedbackText.text = lastAnswerIsYes ? "已選擇：O" : "已選擇：X";
            }
            else
            {
                answerFeedbackText.text = "";
            }
        }

        if (yesButtonRenderer != null && normalMaterial != null)
        {
            yesButtonRenderer.material = normalMaterial;
        }

        if (noButtonRenderer != null && normalMaterial != null)
        {
            noButtonRenderer.material = normalMaterial;
        }

        if (!hasAnswered || selectedMaterial == null)
        {
            return;
        }

        if (lastAnswerIsYes && yesButtonRenderer != null)
        {
            yesButtonRenderer.material = selectedMaterial;
        }

        if (!lastAnswerIsYes && noButtonRenderer != null)
        {
            noButtonRenderer.material = selectedMaterial;
        }
    }

    public bool HasAnswered()
    {
        return hasAnswered;
    }

    public bool GetLastAnswerIsYes()
    {
        return lastAnswerIsYes;
    }

    public void ResetQuestionState()
    {
        hasAnswered = false;
        lastAnswerIsYes = false;
        missionCompleted = false;

        if (hideCoroutine != null)
        {
            StopCoroutine(hideCoroutine);
            hideCoroutine = null;
        }

        HideQuestionRoot();
        RefreshAnswerVisual();
    }
}