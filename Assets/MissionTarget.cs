using UnityEngine;

public class MissionTarget : MonoBehaviour
{
    [Header("支線 ID，同一關內不可重複")]
    public string targetId;

    [Header("顯示名稱")]
    public string displayName;

    private bool completed;
    private AuditStageFlowManager manager;

    public void SetManager(AuditStageFlowManager flowManager)
    {
        manager = flowManager;
    }

    public void Complete()
    {
        if (completed)
        {
            return;
        }

        completed = true;

        if (manager != null)
        {
            manager.RegisterMissionComplete(this);
        }
        else
        {
            Debug.LogWarning($"{gameObject.name} 尚未指定 AuditStageFlowManager。", this);
        }
    }

    public string GetId()
    {
        if (!string.IsNullOrWhiteSpace(targetId))
        {
            return targetId;
        }

        return gameObject.name;
    }

    public string GetDisplayName()
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName;
        }

        return gameObject.name;
    }

    public void ResetTarget()
    {
        completed = false;
    }
}