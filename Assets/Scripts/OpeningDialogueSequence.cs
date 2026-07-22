using UnityEngine;
using TMPro;
using System.Collections;
using UnityEngine.Events;

public class OpeningDialogueSequence : MonoBehaviour
{
    [Header("對話框 UI")]
    public GameObject dialogueCanvas;
    public TMP_Text dialogueText;

    [Tooltip("一開始顯示的「開始劇情」按鈕")]
    public GameObject startStoryButton;

    [Tooltip("第一站播放完後顯示的「繼續」按鈕")]
    public GameObject continueButton;

    [Header("聲音播放")]
    public AudioSource audioSource;

    [Header("播放設定")]
    [Tooltip("勾選後會在進入場景時直接播放第一站；若要按按鈕才播放，請不要勾選")]
    public bool playOnStart = false;

    public bool hideCanvasWhenFinished = false;

    [Tooltip("每句語音播放完畢後，等待多久才播放下一句")]
    public float delayAfterEachLine = 0.4f;

    [Header("第一站劇情台詞")]
    [TextArea(2, 5)]
    public string[] dialogueLines;

    [Header("第一站每句對應音檔")]
    public AudioClip[] dialogueClips;

    [Header("第二站劇情台詞")]
    [TextArea(2, 5)]
    public string[] secondStationDialogueLines;

    [Header("第二站每句對應音檔")]
    public AudioClip[] secondStationDialogueClips;

    [Header("播完第二站後要啟用的 LLM，可不填")]
    public OpenAIManager openAIManager;

    [Header("劇情事件")]
    [Tooltip("第一段劇情播放完畢時觸發。通常不用接主流程，只用來顯示繼續按鈕。")]
    public UnityEvent onFirstStationFinished;

    [Tooltip("全部劇情播放完畢時觸發。請把主系統解鎖支線、開透明牆、開始倒數接在這裡。")]
    public UnityEvent onAllDialogueFinished;

    private int currentIndex = 0;
    private bool isPlayingSequence = false;
    private Coroutine dialogueCoroutine;

    // 0 = 沒播放，1 = 第一段，2 = 第二段
    private int currentStage = 0;

    private void Start()
    {
        if (openAIManager != null)
        {
            openAIManager.enabled = false;
        }

        if (dialogueCanvas != null)
        {
            dialogueCanvas.SetActive(true);
        }

        if (dialogueText != null)
        {
            dialogueText.text = "";
        }

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);

        if (playOnStart)
        {
            StartOpeningDialogue();
        }
        else
        {
            SetStartButtonVisible(true);
        }
    }

    /// <summary>
    /// 給「開始劇情」按鈕呼叫。
    /// 播放第一段劇情。
    /// </summary>
    public void StartOpeningDialogue()
    {
        if (isPlayingSequence)
        {
            return;
        }

        if (dialogueLines == null || dialogueLines.Length == 0)
        {
            Debug.LogWarning("尚未設定第一段劇情台詞。", this);
            SetStartButtonVisible(true);
            return;
        }

        currentStage = 1;
        currentIndex = 0;
        isPlayingSequence = true;

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);

        if (dialogueCanvas != null)
        {
            dialogueCanvas.SetActive(true);
        }

        dialogueCoroutine = StartCoroutine(
            PlayDialogueSequence(
                dialogueLines,
                dialogueClips,
                OnFirstStageFinished
            )
        );
    }

    /// <summary>
    /// 給「繼續」按鈕呼叫。
    /// 播放第二段劇情。
    /// </summary>
    public void StartSecondStationDialogue()
    {
        if (isPlayingSequence)
        {
            return;
        }

        if (secondStationDialogueLines == null || secondStationDialogueLines.Length == 0)
        {
            Debug.LogWarning("尚未設定第二段劇情台詞，將直接視為全部劇情完成。", this);
            OnSecondStageFinished();
            return;
        }

        currentStage = 2;
        currentIndex = 0;
        isPlayingSequence = true;

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);

        if (dialogueCanvas != null)
        {
            dialogueCanvas.SetActive(true);
        }

        dialogueCoroutine = StartCoroutine(
            PlayDialogueSequence(
                secondStationDialogueLines,
                secondStationDialogueClips,
                OnSecondStageFinished
            )
        );
    }

    private IEnumerator PlayDialogueSequence(
        string[] lines,
        AudioClip[] clips,
        System.Action onFinished
    )
    {
        while (currentIndex < lines.Length)
        {
            ShowCurrentLine(lines);
            PlayCurrentAudio(clips);

            float audioLength = GetCurrentAudioLength(clips);

            if (audioLength > 0f)
            {
                yield return new WaitForSeconds(audioLength + delayAfterEachLine);
            }
            else
            {
                float fallbackWaitTime = GetFallbackWaitTime(lines[currentIndex]);
                yield return new WaitForSeconds(fallbackWaitTime + delayAfterEachLine);
            }

            currentIndex++;
        }

        dialogueCoroutine = null;
        isPlayingSequence = false;

        if (audioSource != null)
        {
            audioSource.Stop();
            audioSource.clip = null;
        }

        onFinished?.Invoke();
    }

    private void ShowCurrentLine(string[] lines)
    {
        if (dialogueText == null)
        {
            Debug.LogWarning("尚未綁定 DialogueText。", this);
            return;
        }

        if (lines == null || currentIndex < 0 || currentIndex >= lines.Length)
        {
            return;
        }

        dialogueText.text = lines[currentIndex];
    }

    private void PlayCurrentAudio(AudioClip[] clips)
    {
        if (audioSource == null)
        {
            Debug.LogWarning("尚未綁定 AudioSource，將只顯示字幕。", this);
            return;
        }

        if (clips == null ||
            currentIndex >= clips.Length ||
            clips[currentIndex] == null)
        {
            Debug.LogWarning($"第 {currentIndex + 1} 句沒有設定音檔，將使用字幕等待時間。", this);
            return;
        }

        audioSource.Stop();
        audioSource.clip = clips[currentIndex];
        audioSource.Play();
    }

    private float GetCurrentAudioLength(AudioClip[] clips)
    {
        if (clips == null)
        {
            return 0f;
        }

        if (currentIndex < 0 || currentIndex >= clips.Length)
        {
            return 0f;
        }

        if (clips[currentIndex] == null)
        {
            return 0f;
        }

        return clips[currentIndex].length;
    }

    private float GetFallbackWaitTime(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return 1.5f;
        }

        return Mathf.Clamp(text.Length * 0.12f, 2.0f, 8.0f);
    }

    private void OnFirstStageFinished()
    {
        currentStage = 0;

        if (dialogueText != null)
        {
            dialogueText.text = "第一段劇情播放完成，請按「繼續」。";
        }

        SetStartButtonVisible(false);
        SetContinueButtonVisible(true);

        onFirstStationFinished?.Invoke();

        Debug.Log("第一段劇情播放完成，等待繼續播放第二段。", this);
    }

    private void OnSecondStageFinished()
    {
        currentStage = 0;

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);

        if (hideCanvasWhenFinished && dialogueCanvas != null)
        {
            dialogueCanvas.SetActive(false);
        }

        if (openAIManager != null)
        {
            openAIManager.enabled = true;
        }

        onAllDialogueFinished?.Invoke();

        Debug.Log("全部劇情播放完成，已觸發 onAllDialogueFinished。", this);
    }

    public void SkipDialogueSequence()
    {
        if (dialogueCoroutine != null)
        {
            StopCoroutine(dialogueCoroutine);
            dialogueCoroutine = null;
        }

        if (audioSource != null)
        {
            audioSource.Stop();
            audioSource.clip = null;
        }

        isPlayingSequence = false;

        if (currentStage == 1)
        {
            OnFirstStageFinished();
        }
        else if (currentStage == 2)
        {
            OnSecondStageFinished();
        }
    }

    public void ResetOpeningDialogue()
    {
        if (dialogueCoroutine != null)
        {
            StopCoroutine(dialogueCoroutine);
            dialogueCoroutine = null;
        }

        if (audioSource != null)
        {
            audioSource.Stop();
            audioSource.clip = null;
        }

        currentStage = 0;
        currentIndex = 0;
        isPlayingSequence = false;

        if (dialogueCanvas != null)
        {
            dialogueCanvas.SetActive(true);
        }

        if (dialogueText != null)
        {
            dialogueText.text = "";
        }

        if (openAIManager != null)
        {
            openAIManager.enabled = false;
        }

        SetStartButtonVisible(true);
        SetContinueButtonVisible(false);
    }

    private void SetStartButtonVisible(bool visible)
    {
        if (startStoryButton != null)
        {
            startStoryButton.SetActive(visible);
        }
    }

    private void SetContinueButtonVisible(bool visible)
    {
        if (continueButton != null)
        {
            continueButton.SetActive(visible);
        }
    }
}