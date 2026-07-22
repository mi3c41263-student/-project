using System.Collections;
using TMPro;
using UnityEngine;

public class BlackScreenTransition : MonoBehaviour
{
    [Header("黑屏 CanvasGroup")]
    [SerializeField] private CanvasGroup canvasGroup;

    [Header("轉場文字")]
    [SerializeField] private TMP_Text transitionText;

    [Header("淡入淡出秒數")]
    [SerializeField] private float fadeDuration = 1.0f;

    [Header("黑屏停留秒數")]
    [SerializeField] private float holdDuration = 1.5f;

    private void Awake()
    {
        HideImmediate();
    }

    public IEnumerator Play(string message)
    {
        gameObject.SetActive(true);

        if (transitionText != null)
        {
            transitionText.text = message;
        }

        yield return Fade(0f, 1f);

        yield return new WaitForSeconds(holdDuration);

        yield return Fade(1f, 0f);

        HideImmediate();
    }

    private IEnumerator Fade(float from, float to)
    {
        float timer = 0f;

        while (timer < fadeDuration)
        {
            timer += Time.deltaTime;
            float t = timer / fadeDuration;

            if (canvasGroup != null)
            {
                canvasGroup.alpha = Mathf.Lerp(from, to, t);
                canvasGroup.blocksRaycasts = true;
            }

            yield return null;
        }

        if (canvasGroup != null)
        {
            canvasGroup.alpha = to;
        }
    }

    private void HideImmediate()
    {
        if (canvasGroup != null)
        {
            canvasGroup.alpha = 0f;
            canvasGroup.blocksRaycasts = false;
        }

        if (transitionText != null)
        {
            transitionText.text = "";
        }
    }
}