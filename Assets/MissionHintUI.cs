using TMPro;
using UnityEngine;

public class MissionHintUI : MonoBehaviour
{
    [Header("整個提示框")]
    [SerializeField] private GameObject root;

    [Header("提示文字")]
    [SerializeField] private TMP_Text hintText;

    [Header("倒數文字")]
    [SerializeField] private TMP_Text timerText;

    [Header("完成度文字")]
    [SerializeField] private TMP_Text progressText;

    public void Show(string hint, int totalTargets)
    {
        if (root != null)
        {
            root.SetActive(true);
        }

        if (hintText != null)
        {
            hintText.text = hint;
        }

        UpdateProgress(0, totalTargets);
    }

    public void Hide()
    {
        if (root != null)
        {
            root.SetActive(false);
        }
    }

    public void UpdateTimer(float remainingSeconds)
    {
        int seconds = Mathf.Max(0, Mathf.CeilToInt(remainingSeconds));
        int min = seconds / 60;
        int sec = seconds % 60;

        if (timerText != null)
        {
            timerText.text = $"剩餘時間：{min:00}:{sec:00}";
        }
    }

    public void UpdateProgress(int completed, int total)
    {
        if (progressText == null) return;

        if (total <= 0)
        {
            progressText.text = "完成度：0/0";
            return;
        }

        if (completed >= total)
        {
            progressText.text = $"完成度：{completed}/{total}　已完成所有支線";
        }
        else
        {
            progressText.text = $"完成度：{completed}/{total}";
        }
    }
}