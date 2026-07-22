using System.Collections;
using TMPro;
using UnityEngine;

public class ExitBarrierController : MonoBehaviour
{
    [Header("出口界線")]
    [Tooltip("拖入門口的 ExitBarrier 物件")]
    public GameObject exitBarrier;

    [Header("時間設定")]
    [Tooltip("180 秒等於 3 分鐘")]
    public float lockDuration = 180f;

    [Tooltip("測試時可勾選。正式使用開始按鈕時不要勾選")]
    public bool startTimerOnPlay = false;

    [Header("倒數文字，可不設定")]
    public TMP_Text countdownText;

    private Coroutine countdownCoroutine;
    private bool timerStarted;
    private bool barrierUnlocked;

    private void Start()
    {
        // 遊戲開始時先啟用出口界線
        LockBarrier();

        // 測試模式：按 Play 後直接開始計時
        if (startTimerOnPlay)
        {
            BeginBarrierTimer();
        }
    }

    /// <summary>
    /// 開始三分鐘倒數。
    /// 之後可以讓「開始劇情」按鈕呼叫這個函式。
    /// </summary>
    public void BeginBarrierTimer()
    {
        if (timerStarted || barrierUnlocked)
        {
            return;
        }

        timerStarted = true;
        countdownCoroutine = StartCoroutine(CountdownRoutine());

        Debug.Log("出口界線倒數開始，剩餘時間：" + lockDuration + " 秒。");
    }

    private IEnumerator CountdownRoutine()
    {
        float remainingTime = lockDuration;

        while (remainingTime > 0f)
        {
            UpdateCountdownText(remainingTime);

            yield return new WaitForSeconds(1f);
            remainingTime -= 1f;
        }

        UnlockBarrier();
    }

    private void UpdateCountdownText(float remainingTime)
    {
        if (countdownText == null)
        {
            return;
        }

        int totalSeconds = Mathf.CeilToInt(remainingTime);
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;

        countdownText.text =
            $"距離可離開區域：{minutes:00}:{seconds:00}";
    }

    /// <summary>
    /// 解除出口界線，玩家可以離開。
    /// </summary>
    public void UnlockBarrier()
    {
        if (barrierUnlocked)
        {
            return;
        }

        barrierUnlocked = true;
        timerStarted = false;
        countdownCoroutine = null;

        if (exitBarrier != null)
        {
            exitBarrier.SetActive(false);
        }

        if (countdownText != null)
        {
            countdownText.text = "現在可以離開此區域。";
        }

        Debug.Log("三分鐘已到，出口界線已解除。");
    }

    /// <summary>
    /// 重新封鎖出口。可用於重新開始場景。
    /// </summary>
    public void ResetBarrier()
    {
        if (countdownCoroutine != null)
        {
            StopCoroutine(countdownCoroutine);
            countdownCoroutine = null;
        }

        timerStarted = false;
        barrierUnlocked = false;

        LockBarrier();
    }

    private void LockBarrier()
    {
        if (exitBarrier != null)
        {
            exitBarrier.SetActive(true);
        }

        if (countdownText != null)
        {
            countdownText.text = "出口目前尚未開放。";
        }
    }
}