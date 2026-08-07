using UnityEngine;
using TMPro;
using UnityEngine.Events;
using System.Collections;

public class OpeningDialogueSequence : MonoBehaviour
{
    [Header("對話框 UI")]
    public GameObject dialogueCanvas;
    public TMP_Text dialogueText;

    [Tooltip("一開始顯示的「開始劇情」按鈕。若這段劇情是由 GameFlowManager 自動播放，可以留空或搭配 Show Start Button On Reset 關閉。")]
    public GameObject startStoryButton;

    [Tooltip("第一段播放完後顯示的「繼續」按鈕")]
    public GameObject continueButton;

    [Header("按鈕顯示控制")]
    [Tooltip("Reset 或 Start 時是否自動顯示開始劇情按鈕。自動播放劇情請取消勾選；需要玩家手動按開始請勾選。")]
    public bool showStartButtonOnReset = true;

    [Tooltip("如果有第二段劇情，第一段播完後是否等待玩家按繼續")]
    public bool waitContinueBeforeSecondPart = true;

    [Header("聲音播放")]
    public AudioSource audioSource;

    [Header("播放設定")]
    [Tooltip("勾選後會在進入場景時直接播放；目前若交給 GameFlowManager 控制，請不要勾選")]
    public bool playOnStart = false;

    [Tooltip("全部劇情播放完後是否隱藏對話框")]
    public bool hideCanvasWhenFinished = true;

    [Tooltip("每句語音播放完畢後，等待多久才播放下一句")]
    public float delayAfterEachLine = 0.4f;

    [Header("第一段劇情台詞")]
    [TextArea(2, 5)]
    public string[] dialogueLines;

    [Header("第一段每句對應音檔")]
    public AudioClip[] dialogueClips;

    [Header("第二段劇情台詞，可不填")]
    [TextArea(2, 5)]
    public string[] secondStationDialogueLines;

    [Header("第二段每句對應音檔，可不填")]
    public AudioClip[] secondStationDialogueClips;

    [Header("全部劇情播完後要啟用的 LLM，可不填")]
    public OpenAIManager openAIManager;

    [Header("全部劇情播放完畢後要通知誰")]
    public UnityEvent onAllDialogueFinished;

    private int currentIndex = 0;
    private bool isPlayingSequence = false;
    private bool firstPartFinished = false;
    private bool allDialogueFinished = false;
    private Coroutine dialogueCoroutine;

    // 0 = 沒播放，1 = 第一段，2 = 第二段
    private int currentPart = 0;

    private void Start()
    {
        if (openAIManager != null)
        {
            openAIManager.enabled = false;
        }

        if (dialogueText != null)
        {
            dialogueText.text = "";
        }

        SetContinueButtonVisible(false);

        if (playOnStart)
        {
            SetStartButtonVisible(false);
            StartOpeningDialogue();
        }
        else
        {
            ResetOpeningDialogue();
        }
    }

    /// <summary>
    /// 給「開始劇情」按鈕或 GameFlowManager 呼叫。
    /// 播放第一段劇情。
    /// </summary>
    public void StartOpeningDialogue()
    {
        if (isPlayingSequence)
        {
            return;
        }

        if (allDialogueFinished)
        {
            Debug.LogWarning($"{gameObject.name} 劇情已經全部播放完成。若要重播，請先呼叫 ResetOpeningDialogue。", this);
            return;
        }

        if (dialogueLines == null || dialogueLines.Length == 0)
        {
            Debug.LogWarning($"{gameObject.name} 尚未設定第一段劇情台詞。", this);
            SetStartButtonVisible(showStartButtonOnReset);
            return;
        }

        currentPart = 1;
        currentIndex = 0;
        firstPartFinished = false;
        isPlayingSequence = true;

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);
        SetDialogueCanvasVisible(true);

        dialogueCoroutine = StartCoroutine(
            PlayDialogueSequence(
                dialogueLines,
                dialogueClips,
                OnFirstPartFinished
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

        if (!firstPartFinished)
        {
            Debug.LogWarning($"{gameObject.name} 第一段尚未播放完成，不能播放第二段。", this);
            return;
        }

        if (!HasSecondPart())
        {
            FinishAllDialogue();
            return;
        }

        currentPart = 2;
        currentIndex = 0;
        isPlayingSequence = true;

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);
        SetDialogueCanvasVisible(true);

        dialogueCoroutine = StartCoroutine(
            PlayDialogueSequence(
                secondStationDialogueLines,
                secondStationDialogueClips,
                FinishAllDialogue
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
            Debug.LogWarning($"{gameObject.name} 尚未綁定 DialogueText。", this);
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
            Debug.LogWarning($"{gameObject.name} 尚未綁定 AudioSource，將只顯示字幕。", this);
            return;
        }

        if (clips == null ||
            currentIndex >= clips.Length ||
            clips[currentIndex] == null)
        {
            Debug.LogWarning($"{gameObject.name} 第 {currentIndex + 1} 句沒有設定音檔，將使用字幕等待時間。", this);
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

    private void OnFirstPartFinished()
    {
        firstPartFinished = true;
        currentPart = 0;

        if (HasSecondPart())
        {
            if (dialogueText != null)
            {
                dialogueText.text = "第一段劇情播放完成，請按「繼續」。";
            }

            if (waitContinueBeforeSecondPart)
            {
                SetContinueButtonVisible(true);
                Debug.Log($"{gameObject.name} 第一段劇情播放完成，等待繼續播放第二段。", this);
            }
            else
            {
                StartSecondStationDialogue();
            }
        }
        else
        {
            FinishAllDialogue();
        }
    }

    private bool HasSecondPart()
    {
        return secondStationDialogueLines != null &&
               secondStationDialogueLines.Length > 0;
    }

    private void FinishAllDialogue()
    {
        if (allDialogueFinished)
        {
            return;
        }

        currentPart = 0;
        currentIndex = 0;
        isPlayingSequence = false;
        allDialogueFinished = true;

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);

        if (audioSource != null)
        {
            audioSource.Stop();
            audioSource.clip = null;
        }

        if (openAIManager != null)
        {
            openAIManager.enabled = true;
        }

        if (hideCanvasWhenFinished)
        {
            SetDialogueCanvasVisible(false);
        }

        Debug.Log($"{gameObject.name} 全部劇情播放完成，通知 GameFlowManager。", this);

        onAllDialogueFinished?.Invoke();
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

        if (currentPart == 1)
        {
            OnFirstPartFinished();
        }
        else if (currentPart == 2)
        {
            FinishAllDialogue();
        }
        else
        {
            FinishAllDialogue();
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

        currentPart = 0;
        currentIndex = 0;
        isPlayingSequence = false;
        firstPartFinished = false;
        allDialogueFinished = false;

        if (dialogueText != null)
        {
            dialogueText.text = "";
        }

        if (openAIManager != null)
        {
            openAIManager.enabled = false;
        }

        SetDialogueCanvasVisible(true);
        SetStartButtonVisible(showStartButtonOnReset);
        SetContinueButtonVisible(false);
    }

    public void ForceCloseDialogueCanvas()
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

        SetStartButtonVisible(false);
        SetContinueButtonVisible(false);
        SetDialogueCanvasVisible(false);
    }

    private void SetDialogueCanvasVisible(bool visible)
    {
        if (dialogueCanvas != null)
        {
            dialogueCanvas.SetActive(visible);
        }
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