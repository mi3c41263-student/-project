using UnityEngine;
using UnityEngine.Events;

public class DocumentDefectController : MonoBehaviour
{
    [Header("原始文件上的紅色圓圈")]
    [SerializeField]
    private GameObject originalRedCircle;

    [Header("放大文件上的紅色圓圈")]
    [SerializeField]
    private GameObject viewRedCircle;

    [Header("是否只能找到一次")]
    [SerializeField]
    private bool revealOnlyOnce = true;

    [Header("找到缺失後的額外事件，例如加分")]
    [SerializeField]
    private UnityEvent onCorrectFound;

    private bool hasBeenFound;

    private void Awake()
    {
        // 遊戲開始時，兩個紅圈都隱藏。
        SetCircleState(false);
    }

    /// <summary>
    /// 使用者點到正確位置時執行。
    /// </summary>
    public void RevealDefect()
    {
        if (revealOnlyOnce && hasBeenFound)
        {
            return;
        }

        hasBeenFound = true;

        // 同時顯示原始文件和放大文件的紅圈。
        SetCircleState(true);

        Debug.Log("已找到員工評核表的缺失位置。", this);

        // 未來可以在 Inspector 接上加分、音效或提示文字。
        onCorrectFound?.Invoke();
    }

    /// <summary>
    /// 重新開始題目時，可呼叫這個函式。
    /// </summary>
    public void ResetDefect()
    {
        hasBeenFound = false;
        SetCircleState(false);
    }

    private void SetCircleState(bool visible)
    {
        if (originalRedCircle != null)
        {
            originalRedCircle.SetActive(visible);
        }

        if (viewRedCircle != null)
        {
            viewRedCircle.SetActive(visible);
        }
    }
}