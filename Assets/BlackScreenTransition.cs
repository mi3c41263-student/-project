using System;
using System.Collections;
using TMPro;
using UnityEngine;

public class BlackScreenTransition : MonoBehaviour
{
    [Header("黑幕 CanvasGroup")]
    [SerializeField] private CanvasGroup canvasGroup;

    [Header("轉場文字")]
    [SerializeField] private TMP_Text transitionText;

    [Header("淡入淡出秒數")]
    [SerializeField] private float fadeDuration = 1.0f;

    [Header("黑幕停留秒數")]
    [SerializeField] private float holdDuration = 1.5f;

    public bool IsPlaying { get; private set; }

    private void Awake()
    {
        if (canvasGroup == null)
        {
            canvasGroup = GetComponent<CanvasGroup>();
        }

        gameObject.SetActive(true);
        HideImmediate();
    }

    public IEnumerator Play(string message)
    {
        yield return Play(message, null);
    }

    public IEnumerator Play(string message, Action onFullyBlack)
    {
        Debug.Log($"黑幕開始：{message}", this);

        IsPlaying = true;
        gameObject.SetActive(true);

        if (canvasGroup == null)
        {
            Debug.LogWarning("BlackScreenTransition 沒有指定 CanvasGroup。", this);
            yield break;
        }

        if (transitionText != null)
        {
            transitionText.gameObject.SetActive(true);
            transitionText.text = message;
        }
        else
        {
            Debug.LogWarning("BlackScreenTransition 沒有指定 TransitionText。", this);
        }

        canvasGroup.blocksRaycasts = true;
        canvasGroup.interactable = true;

        yield return Fade(0f, 1f);

        Debug.Log("黑幕已全黑，準備切換站位。", this);

        onFullyBlack?.Invoke();

        yield return new WaitForSeconds(holdDuration);

        yield return Fade(1f, 0f);

        HideImmediate();

        IsPlaying = false;

        Debug.Log("黑幕結束。", this);
    }

    /// <summary>
    /// 結尾黑幕使用。
    /// 會淡入、顯示文字、停留指定秒數，最後停在黑幕畫面，不會淡出。
    /// </summary>
    public IEnumerator PlayEnding(string message, float endingHoldDuration)
    {
        Debug.Log($"結尾黑幕開始：{message}", this);

        IsPlaying = true;
        gameObject.SetActive(true);

        if (canvasGroup == null)
        {
            Debug.LogWarning("BlackScreenTransition 沒有指定 CanvasGroup。", this);
            yield break;
        }

        if (transitionText != null)
        {
            transitionText.gameObject.SetActive(true);
            transitionText.text = message;
        }
        else
        {
            Debug.LogWarning("BlackScreenTransition 沒有指定 TransitionText。", this);
        }

        canvasGroup.blocksRaycasts = true;
        canvasGroup.interactable = true;

        yield return Fade(0f, 1f);

        yield return new WaitForSeconds(endingHoldDuration);

        // 結尾不淡出，讓畫面停在 The End 黑幕。
        canvasGroup.alpha = 1f;
        canvasGroup.blocksRaycasts = true;
        canvasGroup.interactable = true;

        IsPlaying = false;

        Debug.Log("結尾黑幕完成，畫面停留。", this);
    }

    public void ForceHide()
    {
        StopAllCoroutines();
        IsPlaying = false;
        HideImmediate();
    }

    private IEnumerator Fade(float from, float to)
    {
        float timer = 0f;

        canvasGroup.alpha = from;

        while (timer < fadeDuration)
        {
            timer += Time.deltaTime;
            float t = Mathf.Clamp01(timer / fadeDuration);
            canvasGroup.alpha = Mathf.Lerp(from, to, t);
            yield return null;
        }

        canvasGroup.alpha = to;
    }

    private void HideImmediate()
    {
        if (canvasGroup != null)
        {
            canvasGroup.alpha = 0f;
            canvasGroup.blocksRaycasts = false;
            canvasGroup.interactable = false;
        }

        if (transitionText != null)
        {
            transitionText.text = "";
        }
    }
}