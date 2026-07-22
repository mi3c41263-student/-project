using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit.Interactables;

public class AuditStageFlowManager : MonoBehaviour
{
    [System.Serializable]
    public class AuditStage
    {
        [Header("站點名稱，只是方便辨識")]
        public string stageName;

        [Header("這一站的玩家站位點")]
        public Transform spawnPoint;

        [Header("這一站的劇情腳本")]
        public OpeningDialogueSequence dialogue;

        [Header("這一站的透明牆")]
        public GameObject barrier;

        [Header("這一站的支線物件群")]
        public GameObject missionRoot;

        [Header("這一站自己的提示框")]
        public MissionHintUI missionHintUI;

        [Header("提示文字")]
        [TextArea(2, 4)]
        public string hintText;

        [Header("倒數秒數")]
        public float timeLimit = 120f;

        [Header("支線全完成後是否提前進下一步")]
        public bool goNextWhenAllTargetsCompleted = true;

        [Header("全完成後延遲幾秒再轉場")]
        public float goNextDelayAfterCompleted = 1.2f;

        [Header("黑屏轉場文字")]
        public string transitionText;

        [Header("下一站站位點，可不填")]
        public Transform nextSpawnPoint;

        [Header("是否一開始就顯示支線物件")]
        public bool showMissionObjectsFromStart = true;

        [Header("是否一開始就開啟透明牆")]
        public bool barrierActiveFromStart = true;
    }

    [Header("登入 / 開始畫面")]
    [SerializeField] private GameObject loginCanvas;

    [Header("玩家 XR Origin")]
    [SerializeField] private Transform xrOrigin;

    [Header("黑屏轉場")]
    [SerializeField] private BlackScreenTransition blackTransition;

    [Header("所有站點")]
    [SerializeField] private AuditStage[] stages;

    [Header("測試用：按 Play 後自動開始")]
    [SerializeField] private bool autoStartOnPlay = false;

    private int currentStageIndex = -1;

    private MissionTarget[] currentTargets;
    private XRBaseInteractable[] currentInteractables;

    private readonly HashSet<string> completedTargetIds = new HashSet<string>();

    private float remainingTime;
    private bool missionRunning;
    private bool transitionStarted;

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
    }

    private void Update()
    {
        if (!missionRunning || transitionStarted)
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

    /// <summary>
    /// 給 login_Canvas 的開始按鈕，或測試開始按鈕呼叫。
    /// </summary>
    public void StartGameAfterLogin()
    {
        if (loginCanvas != null)
        {
            loginCanvas.SetActive(false);
        }

        StartStage(0);
    }

    private void StartStage(int stageIndex)
    {
        if (stages == null || stageIndex < 0 || stageIndex >= stages.Length)
        {
            Debug.LogWarning("沒有下一站資料，流程結束。", this);
            return;
        }

        currentStageIndex = stageIndex;
        missionRunning = false;
        transitionStarted = false;
        completedTargetIds.Clear();

        AuditStage stage = stages[currentStageIndex];

        Debug.Log($"開始站點：{stage.stageName}", this);

        MovePlayerTo(stage.spawnPoint);

        if (stage.barrier != null)
        {
            stage.barrier.SetActive(true);
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

        if (stage.missionHintUI != null)
        {
            stage.missionHintUI.Hide();
        }

        if (stage.dialogue != null)
        {
            stage.dialogue.StartOpeningDialogue();
        }
        else
        {
            StartCurrentStageMission();
        }
    }

    /// <summary>
    /// 給每一站 OpeningDialogueSequence 的 On All Dialogue Finished 呼叫。
    /// </summary>
    public void OnCurrentStageDialogueFinished()
    {
        StartCurrentStageMission();
    }

    /// <summary>
    /// 舊版事件相容用。
    /// 原本接 OnFirstStageDialogueFinished 的地方可以繼續使用。
    /// </summary>
    public void OnFirstStageDialogueFinished()
    {
        StartCurrentStageMission();
    }

    private void StartCurrentStageMission()
    {
        AuditStage stage = GetCurrentStage();

        if (stage == null)
        {
            Debug.LogWarning("目前沒有有效站點，無法解鎖支線。", this);
            return;
        }

        completedTargetIds.Clear();
        transitionStarted = false;

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
        }
        else
        {
            currentTargets = new MissionTarget[0];
            currentInteractables = new XRBaseInteractable[0];
        }

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
        if (transitionStarted)
        {
            return;
        }

        StartCoroutine(GoNextRoutine(delaySeconds, reason));
    }

    private IEnumerator GoNextRoutine(float delaySeconds, string reason)
    {
        transitionStarted = true;
        missionRunning = false;

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

        if (blackTransition != null)
        {
            yield return blackTransition.Play(stage.transitionText);
        }

        int nextIndex = currentStageIndex + 1;

        if (stages != null && nextIndex < stages.Length)
        {
            StartStage(nextIndex);
        }
        else
        {
            if (stage.nextSpawnPoint != null)
            {
                MovePlayerTo(stage.nextSpawnPoint);
            }

            Debug.Log("所有站點流程結束。", this);
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

    private void MovePlayerTo(Transform targetPoint)
    {
        if (xrOrigin == null || targetPoint == null)
        {
            return;
        }

        xrOrigin.position = targetPoint.position;
        xrOrigin.rotation = targetPoint.rotation;
    }
}