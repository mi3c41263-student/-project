using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit.Interactables;

public class AuditStageFlowManager : MonoBehaviour
{
    [System.Serializable]
    public class DialogueStep
    {
        [Header("劇情段落名稱，只是方便辨識")]
        public string stepName;

        [Header("這段劇情的玩家站位點")]
        public Transform spawnPoint;

        [Header("這段劇情要播放的 OpeningDialogueSequence")]
        public OpeningDialogueSequence dialogue;

        [Header("進入這段劇情後是否自動播放")]
        public bool startDialogueAutomatically = true;

        [Header("進入這段劇情前是否播放黑幕")]
        public bool useBlackTransitionBeforeStep = false;

        [Header("進入這段劇情前的黑幕文字")]
        public string transitionTextBeforeStep;
    }

    [System.Serializable]
    public class AuditStage
    {
        [Header("站點名稱，只是方便辨識")]
        public string stageName;

        [Header("這一站的所有劇情段落")]
        public DialogueStep[] dialogueSteps;

        [Header("這一站的透明牆")]
        public GameObject barrier;

        [Header("這一站的支線物件群")]
        public GameObject missionRoot;

        [Header("這一站自己的提示框")]
        public MissionHintUI missionHintUI;

        [Header("提示文字")]
        [TextArea(2, 4)]
        public string hintText;

        [Header("主線劇情全部播完後，用 LLM 自動產生支線提示")]
        public bool generateLLMHintAfterDialogue = false;

        [Header("負責產生支線提示的 OpenAIManager，可不填")]
        public OpenAIManager llmHintOpenAIManager;

        [Header("給 LLM 的支線提示指令，可不填")]
        [TextArea(2, 5)]
        public string llmHintPrompt =
            "系統事件：目前站點的主線劇情已經全部播放完畢。"
            + "請你以 VR 資安稽核遊戲 NPC 的口吻，"
            + "自然提醒玩家接下來巡視現場並完成後續支線稽核。"
            + "請使用繁體中文，不要列點，控制在 20 到 35 字。"
            + "必須只回傳 JSON，格式為：{ \"reply\": \"你的台詞\", \"emotion\": \"professional\" }";

        [Header("倒數秒數")]
        public float timeLimit = 120f;

        [Header("支線全完成後是否提前進下一步")]
        public bool goNextWhenAllTargetsCompleted = true;

        [Header("全完成後延遲幾秒再轉場")]
        public float goNextDelayAfterCompleted = 5f;

        [Header("此站結束後的黑幕轉場文字")]
        public string transitionText;

        [Header("是否一開始就顯示支線物件")]
        public bool showMissionObjectsFromStart = true;

        [Header("是否一開始就開啟透明牆")]
        public bool barrierActiveFromStart = true;

        [Header("這一站劇情播完後是否直接結束遊戲")]
        [Tooltip("最後一站會議室請勾選。勾選後，劇情播完會直接播放 The End 黑幕，不會開支線。")]
        public bool finishGameAfterDialogue = false;
    }

    [Header("登入 / 開始畫面，暫時沒有可以空著")]
    [SerializeField] private GameObject loginCanvas;

    [Header("玩家 XR Origin")]
    [SerializeField] private Transform xrOrigin;

    [Header("黑幕轉場")]
    [SerializeField] private BlackScreenTransition blackTransition;

    [Header("進入第一站前是否播放黑幕")]
    [SerializeField] private bool playOpeningBlackTransition = true;

    [Header("進入第一站前的黑幕文字")]
    [SerializeField] private string openingTransitionText = "第一站：主管辦公室";

    [Header("所有站點")]
    [SerializeField] private AuditStage[] stages;

    [Header("結尾黑幕設定")]
    [SerializeField] private bool playEndingBlackScreen = true;

    [SerializeField] private string endingText = "The End";

    [SerializeField] private float endingHoldDuration = 30f;

    [Header("測試用：按 Play 後自動開始")]
    [SerializeField] private bool autoStartOnPlay = false;

    private int currentStageIndex = -1;
    private int currentDialogueStepIndex = -1;

    private MissionTarget[] currentTargets;
    private XRBaseInteractable[] currentInteractables;

    private readonly HashSet<string> completedTargetIds = new HashSet<string>();

    private float remainingTime;
    private bool missionRunning;
    private bool transitionStarted;
    private bool dialogueStartedForCurrentStep;
    private bool dialogueStepTransitionRunning;
    private bool gameStarted;
    private bool endingStarted;

    private void Start()
    {
        if (loginCanvas != null)
        {
            loginCanvas.SetActive(true);
        }

        InitializeAllStages();

        if (autoStartOnPlay)
        {
            StartGameAfterLogin();
        }
        else
        {
            ShowInitialStartButtonIfNeeded();
        }
    }

    private void Update()
    {
        if (!missionRunning || transitionStarted || endingStarted)
        {
            return;
        }

        remainingTime -= Time.deltaTime;

        AuditStage currentStage = GetCurrentStage();

        if (currentStage != null && currentStage.missionHintUI != null)
        {
            currentStage.missionHintUI.UpdateTimer(remainingTime);
        }

        if (remainingTime <= 0f)
        {
            BeginGoNext(0f, "時間到");
        }
    }

    private void InitializeAllStages()
    {
        HideAllDialogueCanvases();

        if (stages == null)
        {
            return;
        }

        foreach (AuditStage stage in stages)
        {
            if (stage == null)
            {
                continue;
            }

            if (stage.missionRoot != null)
            {
                stage.missionRoot.SetActive(stage.showMissionObjectsFromStart);

                XRBaseInteractable[] interactables =
                    stage.missionRoot.GetComponentsInChildren<XRBaseInteractable>(true);

                foreach (XRBaseInteractable interactable in interactables)
                {
                    if (interactable != null)
                    {
                        interactable.enabled = false;
                    }
                }
            }

            if (stage.barrier != null)
            {
                stage.barrier.SetActive(stage.barrierActiveFromStart);
            }

            if (stage.missionHintUI != null)
            {
                stage.missionHintUI.Hide();
            }
        }
    }

    private void ShowInitialStartButtonIfNeeded()
    {
        if (loginCanvas != null)
        {
            return;
        }

        if (stages == null || stages.Length == 0)
        {
            return;
        }

        AuditStage firstStage = stages[0];

        if (firstStage == null ||
            firstStage.dialogueSteps == null ||
            firstStage.dialogueSteps.Length == 0)
        {
            return;
        }

        DialogueStep firstStep = firstStage.dialogueSteps[0];

        if (firstStep != null && firstStep.dialogue != null)
        {
            firstStep.dialogue.ResetOpeningDialogue();
        }
    }

    /// <summary>
    /// 給 login_Canvas 的開始按鈕，或目前的第一站開始按鈕呼叫。
    /// 第一次呼叫會啟動整個流程。
    /// 流程已經開始後再呼叫，會改成播放目前劇情段落。
    /// </summary>
    public void StartGameAfterLogin()
    {
        if (endingStarted)
        {
            return;
        }

        if (gameStarted)
        {
            Debug.Log("遊戲流程已經開始，改為播放目前劇情段落。", this);
            StartCurrentStageDialogue();
            return;
        }

        gameStarted = true;

        if (loginCanvas != null)
        {
            loginCanvas.SetActive(false);
        }

        HideAllDialogueCanvases();

        StartCoroutine(StartGameAfterLoginRoutine());
    }

    private IEnumerator StartGameAfterLoginRoutine()
    {
        if (playOpeningBlackTransition && blackTransition != null)
        {
            yield return blackTransition.Play(openingTransitionText, () =>
            {
                StartStage(0, false);
            });

            BeginCurrentDialogueStepAfterTransition();
        }
        else
        {
            StartStage(0, true);
        }
    }

    private void StartStage(int stageIndex)
    {
        StartStage(stageIndex, true);
    }

    private void StartStage(int stageIndex, bool allowAutoStartDialogue)
    {
        if (endingStarted)
        {
            return;
        }

        if (stages == null || stageIndex < 0 || stageIndex >= stages.Length)
        {
            Debug.LogWarning("沒有下一站資料，流程結束。", this);
            return;
        }

        currentStageIndex = stageIndex;
        currentDialogueStepIndex = -1;

        missionRunning = false;
        transitionStarted = false;
        dialogueStartedForCurrentStep = false;
        dialogueStepTransitionRunning = false;
        completedTargetIds.Clear();

        AuditStage stage = stages[currentStageIndex];

        Debug.Log($"開始站點：{stage.stageName}", this);

        if (stage.barrier != null)
        {
            stage.barrier.SetActive(true);
        }

        SetupCurrentStageMissionObjects(stage);
        HideAllDialogueCanvases();

        if (stage.missionHintUI != null)
        {
            stage.missionHintUI.Hide();
        }

        if (stage.dialogueSteps != null && stage.dialogueSteps.Length > 0)
        {
            PrepareDialogueStep(0);

            if (allowAutoStartDialogue)
            {
                BeginCurrentDialogueStepAfterTransition();
            }
        }
        else
        {
            if (allowAutoStartDialogue)
            {
                StartCurrentStageMission();
            }
        }
    }

    private void SetupCurrentStageMissionObjects(AuditStage stage)
    {
        if (stage == null)
        {
            return;
        }

        if (stage.missionRoot != null)
        {
            stage.missionRoot.SetActive(true);

            currentTargets = stage.missionRoot.GetComponentsInChildren<MissionTarget>(true);
            currentInteractables = stage.missionRoot.GetComponentsInChildren<XRBaseInteractable>(true);

            foreach (MissionTarget target in currentTargets)
            {
                if (target != null)
                {
                    target.SetManager(this);
                    target.ResetTarget();
                }
            }

            SetCurrentStageInteractablesEnabled(false);
        }
        else
        {
            currentTargets = new MissionTarget[0];
            currentInteractables = new XRBaseInteractable[0];
        }
    }

    private void PrepareDialogueStep(int stepIndex)
    {
        AuditStage stage = GetCurrentStage();

        if (stage == null ||
            stage.dialogueSteps == null ||
            stepIndex < 0 ||
            stepIndex >= stage.dialogueSteps.Length)
        {
            return;
        }

        currentDialogueStepIndex = stepIndex;
        dialogueStartedForCurrentStep = false;

        HideAllDialogueCanvases();

        DialogueStep step = stage.dialogueSteps[currentDialogueStepIndex];

        Debug.Log($"準備劇情段落：{stage.stageName} / {step.stepName}", this);

        if (step.spawnPoint != null)
        {
            MovePlayerTo(step.spawnPoint);
        }

        if (step.dialogue != null)
        {
            step.dialogue.ResetOpeningDialogue();
        }
    }

    private void BeginCurrentDialogueStepAfterTransition()
    {
        if (endingStarted)
        {
            return;
        }

        DialogueStep step = GetCurrentDialogueStep();

        if (step == null)
        {
            StartCurrentStageMission();
            return;
        }

        if (step.dialogue == null)
        {
            OnCurrentStageDialogueFinished();
            return;
        }

        if (step.startDialogueAutomatically)
        {
            StartCurrentStageDialogue();
        }
        else
        {
            Debug.Log($"等待玩家按開始劇情：{step.stepName}", this);
        }
    }

    /// <summary>
    /// 給第二站、第三站，或某段劇情的「開始劇情」按鈕呼叫。
    /// </summary>
    public void StartCurrentStageDialogue()
    {
        if (endingStarted)
        {
            return;
        }

        AuditStage stage = GetCurrentStage();
        DialogueStep step = GetCurrentDialogueStep();

        if (stage == null || step == null)
        {
            Debug.LogWarning("目前沒有有效站點或劇情段落，無法播放劇情。", this);
            return;
        }

        if (dialogueStartedForCurrentStep)
        {
            Debug.LogWarning($"劇情段落 {stage.stageName} / {step.stepName} 已經開始過。", this);
            return;
        }

        if (step.dialogue == null)
        {
            OnCurrentStageDialogueFinished();
            return;
        }

        bool hasFirstDialogue =
            step.dialogue.dialogueLines != null &&
            step.dialogue.dialogueLines.Length > 0;

        if (!hasFirstDialogue)
        {
            Debug.LogWarning(
                $"劇情段落 {stage.stageName} / {step.stepName} 尚未設定第一段劇情台詞，請到該 OpeningDialogueSequence 的 Dialogue Lines 填入台詞。",
                step.dialogue
            );
            return;
        }

        dialogueStartedForCurrentStep = true;
        step.dialogue.StartOpeningDialogue();
    }

    /// <summary>
    /// 給每一個 OpeningDialogueSequence 的 On All Dialogue Finished 呼叫。
    /// </summary>
    public void OnCurrentStageDialogueFinished()
    {
        if (endingStarted)
        {
            return;
        }

        if (dialogueStepTransitionRunning)
        {
            return;
        }

        AuditStage stage = GetCurrentStage();

        if (stage == null)
        {
            Debug.LogWarning("目前沒有有效站點，無法處理劇情結束。", this);
            return;
        }

        HideCurrentDialogueCanvas();

        int nextStepIndex = currentDialogueStepIndex + 1;

        if (stage.dialogueSteps != null && nextStepIndex < stage.dialogueSteps.Length)
        {
            StartCoroutine(GoToDialogueStepRoutine(nextStepIndex));
        }
        else
        {
            if (ShouldFinishGameAfterDialogue(stage))
            {
                StartCoroutine(PlayEndingRoutine());
            }
            else
            {
                GenerateLLMHintAfterAllDialogueFinished(stage);
                StartCurrentStageMission();
            }
        }
    }

    /// <summary>
    /// 舊版事件相容用。
    /// 如果原本事件接 OnFirstStageDialogueFinished，也能繼續用。
    /// </summary>
    public void OnFirstStageDialogueFinished()
    {
        OnCurrentStageDialogueFinished();
    }

    private void GenerateLLMHintAfterAllDialogueFinished(AuditStage stage)
    {
        if (stage == null)
        {
            return;
        }

        if (!stage.generateLLMHintAfterDialogue)
        {
            return;
        }

        if (stage.llmHintOpenAIManager == null)
        {
            Debug.LogWarning(
                $"站點 {stage.stageName} 已勾選 LLM 支線提示，但尚未指定 OpenAIManager。",
                this
            );
            return;
        }

        string prompt = string.IsNullOrEmpty(stage.llmHintPrompt)
            ? "系統事件：目前站點的主線劇情已經全部播放完畢。請以 NPC 口吻提醒玩家完成後續支線稽核。必須只回傳 JSON，格式為：{ \"reply\": \"你的台詞\", \"emotion\": \"professional\" }"
            : stage.llmHintPrompt;

        prompt += $"\n目前站點：{stage.stageName}";

        if (!string.IsNullOrEmpty(stage.hintText))
        {
            prompt += $"\n這一站原本的任務提示：{stage.hintText}";
        }

        stage.llmHintOpenAIManager.SendMessageToNPC(prompt);

        Debug.Log($"已送出 LLM 支線提示請求：{stage.stageName}", this);
    }

    private IEnumerator GoToDialogueStepRoutine(int nextStepIndex)
    {
        dialogueStepTransitionRunning = true;

        AuditStage stage = GetCurrentStage();

        if (stage == null ||
            stage.dialogueSteps == null ||
            nextStepIndex < 0 ||
            nextStepIndex >= stage.dialogueSteps.Length)
        {
            dialogueStepTransitionRunning = false;
            yield break;
        }

        DialogueStep nextStep = stage.dialogueSteps[nextStepIndex];

        if (nextStep.useBlackTransitionBeforeStep && blackTransition != null)
        {
            string message = string.IsNullOrEmpty(nextStep.transitionTextBeforeStep)
                ? nextStep.stepName
                : nextStep.transitionTextBeforeStep;

            yield return blackTransition.Play(message, () =>
            {
                PrepareDialogueStep(nextStepIndex);
            });

            dialogueStepTransitionRunning = false;
            BeginCurrentDialogueStepAfterTransition();
        }
        else
        {
            PrepareDialogueStep(nextStepIndex);
            dialogueStepTransitionRunning = false;
            BeginCurrentDialogueStepAfterTransition();
        }
    }

    private void StartCurrentStageMission()
    {
        if (endingStarted)
        {
            return;
        }

        AuditStage stage = GetCurrentStage();

        if (stage == null)
        {
            Debug.LogWarning("目前沒有有效站點，無法解鎖支線。", this);
            return;
        }

        if (ShouldFinishGameAfterDialogue(stage))
        {
            StartCoroutine(PlayEndingRoutine());
            return;
        }

        if (stage.missionRoot == null && stage.missionHintUI == null)
        {
            Debug.Log($"站點 {stage.stageName} 沒有支線，直接進下一站。", this);
            BeginGoNext(0f, "此站沒有支線");
            return;
        }

        completedTargetIds.Clear();
        transitionStarted = false;

        HideAllDialogueCanvases();

        SetupCurrentStageMissionObjects(stage);
        SetCurrentStageInteractablesEnabled(true);

        remainingTime = stage.timeLimit;
        missionRunning = true;

        if (stage.missionHintUI != null)
        {
            stage.missionHintUI.Show(stage.hintText, currentTargets.Length);
            stage.missionHintUI.UpdateTimer(remainingTime);
            stage.missionHintUI.UpdateProgress(0, currentTargets.Length);
        }

        Debug.Log($"站點支線已解鎖：{stage.stageName}，目標數：{currentTargets.Length}", this);
    }

    public void RegisterMissionComplete(MissionTarget target)
    {
        if (endingStarted)
        {
            return;
        }

        if (target == null)
        {
            return;
        }

        AuditStage stage = GetCurrentStage();

        if (stage == null)
        {
            return;
        }

        string id = target.GetId();

        if (completedTargetIds.Contains(id))
        {
            return;
        }

        completedTargetIds.Add(id);

        if (stage.missionHintUI != null)
        {
            stage.missionHintUI.UpdateProgress(completedTargetIds.Count, currentTargets.Length);
        }

        Debug.Log($"完成支線：{target.GetDisplayName()}，目前完成度 {completedTargetIds.Count}/{currentTargets.Length}", this);

        bool allTargetsCompleted =
            currentTargets != null &&
            currentTargets.Length > 0 &&
            completedTargetIds.Count >= currentTargets.Length;

        if (stage.goNextWhenAllTargetsCompleted && allTargetsCompleted)
        {
            BeginGoNext(stage.goNextDelayAfterCompleted, "支線全完成");
        }
    }

    private void BeginGoNext(float delaySeconds, string reason)
    {
        if (endingStarted)
        {
            return;
        }

        if (transitionStarted)
        {
            return;
        }

        transitionStarted = true;
        missionRunning = false;

        StartCoroutine(GoNextRoutine(delaySeconds, reason));
    }

    private IEnumerator GoNextRoutine(float delaySeconds, string reason)
    {
        AuditStage stage = GetCurrentStage();

        if (stage == null)
        {
            yield break;
        }

        Debug.Log($"準備轉場：{stage.stageName}，原因：{reason}", this);

        SetCurrentStageInteractablesEnabled(false);

        if (stage.missionHintUI != null)
        {
            stage.missionHintUI.UpdateProgress(completedTargetIds.Count, currentTargets.Length);
        }

        if (delaySeconds > 0f)
        {
            yield return new WaitForSeconds(delaySeconds);
        }

        if (stage.missionHintUI != null)
        {
            stage.missionHintUI.Hide();
        }

        HideAllDialogueCanvases();

        int nextIndex = currentStageIndex + 1;

        if (blackTransition != null)
        {
            yield return blackTransition.Play(stage.transitionText, () =>
            {
                if (stages != null && nextIndex < stages.Length)
                {
                    StartStage(nextIndex, false);
                }
                else
                {
                    StartCoroutine(PlayEndingRoutine());
                }
            });

            if (stages != null && nextIndex < stages.Length)
            {
                BeginCurrentDialogueStepAfterTransition();
            }
        }
        else
        {
            Debug.LogWarning("尚未指定 BlackTransition，將直接切換站點。", this);

            if (stages != null && nextIndex < stages.Length)
            {
                StartStage(nextIndex, true);
            }
            else
            {
                StartCoroutine(PlayEndingRoutine());
            }
        }
    }

    private bool ShouldFinishGameAfterDialogue(AuditStage stage)
    {
        if (stage == null)
        {
            return false;
        }

        if (stage.finishGameAfterDialogue)
        {
            return true;
        }

        bool isFinalStage =
            stages != null &&
            currentStageIndex >= 0 &&
            currentStageIndex == stages.Length - 1;

        bool hasNoMission =
            stage.missionRoot == null &&
            stage.missionHintUI == null;

        return isFinalStage && hasNoMission;
    }

    private IEnumerator PlayEndingRoutine()
    {
        if (endingStarted)
        {
            yield break;
        }

        endingStarted = true;
        missionRunning = false;
        transitionStarted = true;
        dialogueStepTransitionRunning = false;

        HideAllDialogueCanvases();
        SetCurrentStageInteractablesEnabled(false);

        AuditStage stage = GetCurrentStage();

        if (stage != null && stage.missionHintUI != null)
        {
            stage.missionHintUI.Hide();
        }

        Debug.Log("最後一站劇情完成，播放 The End 黑幕。", this);

        if (blackTransition != null && playEndingBlackScreen)
        {
            yield return blackTransition.PlayEnding(endingText, endingHoldDuration);
        }
        else
        {
            Debug.Log("遊戲流程結束。", this);
        }
    }

    private void SetCurrentStageInteractablesEnabled(bool enabled)
    {
        if (currentInteractables == null)
        {
            return;
        }

        foreach (XRBaseInteractable interactable in currentInteractables)
        {
            if (interactable != null)
            {
                interactable.enabled = enabled;
            }
        }
    }

    private AuditStage GetCurrentStage()
    {
        if (stages == null || currentStageIndex < 0 || currentStageIndex >= stages.Length)
        {
            return null;
        }

        return stages[currentStageIndex];
    }

    private DialogueStep GetCurrentDialogueStep()
    {
        AuditStage stage = GetCurrentStage();

        if (stage == null ||
            stage.dialogueSteps == null ||
            currentDialogueStepIndex < 0 ||
            currentDialogueStepIndex >= stage.dialogueSteps.Length)
        {
            return null;
        }

        return stage.dialogueSteps[currentDialogueStepIndex];
    }

    private void MovePlayerTo(Transform targetPoint)
    {
        if (xrOrigin == null || targetPoint == null)
        {
            Debug.LogWarning("XR Origin 或站位點尚未指定，無法移動玩家。", this);
            return;
        }

        xrOrigin.position = targetPoint.position;
        xrOrigin.rotation = targetPoint.rotation;
    }

    private void HideAllDialogueCanvases()
    {
        if (stages == null)
        {
            return;
        }

        foreach (AuditStage stage in stages)
        {
            if (stage == null || stage.dialogueSteps == null)
            {
                continue;
            }

            foreach (DialogueStep step in stage.dialogueSteps)
            {
                if (step != null &&
                    step.dialogue != null &&
                    step.dialogue.dialogueCanvas != null)
                {
                    step.dialogue.dialogueCanvas.SetActive(false);
                }
            }
        }
    }

    private void HideCurrentDialogueCanvas()
    {
        DialogueStep step = GetCurrentDialogueStep();

        if (step != null &&
            step.dialogue != null &&
            step.dialogue.dialogueCanvas != null)
        {
            step.dialogue.dialogueCanvas.SetActive(false);
        }
    }
}