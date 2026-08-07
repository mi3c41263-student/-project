using UnityEngine;

public class ClickOnlyMissionComplete : MonoBehaviour
{
    [Header("流程管理器")]
    public AuditStageFlowManager flowManager;

    [Header("這個物件自己的 MissionTarget")]
    public MissionTarget missionTarget;

    [Header("是否只完成一次")]
    public bool completeOnlyOnce = true;

    private bool completed = false;

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
    }

    public void CompleteByClick()
    {
        if (completeOnlyOnce && completed)
        {
            return;
        }

        if (flowManager == null)
        {
            Debug.LogWarning($"{gameObject.name} 找不到 AuditStageFlowManager。", this);
            return;
        }

        if (missionTarget == null)
        {
            Debug.LogWarning($"{gameObject.name} 找不到 MissionTarget。", this);
            return;
        }

        completed = true;
        flowManager.RegisterMissionComplete(missionTarget);

        Debug.Log($"{gameObject.name} 已點擊，直接完成支線。", this);
    }

    public void ResetClickComplete()
    {
        completed = false;
    }
}