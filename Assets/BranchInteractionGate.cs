using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit.Interactables;

public class BranchInteractionGate : MonoBehaviour
{
    [Header("所有支線物件的共同父物件")]
    [SerializeField] private Transform branchRoot;

    [Header("遊戲開始時自動鎖定")]
    [SerializeField] private bool lockOnAwake = true;

    private XRBaseInteractable[] branchInteractables;
    private bool[] originalEnabledStates;
    private bool initialized;

    public bool IsLocked { get; private set; }

    private void Awake()
    {
        Initialize();

        if (lockOnAwake)
        {
            LockBranches();
        }
    }

    private void Initialize()
    {
        if (initialized)
        {
            return;
        }

        if (branchRoot == null)
        {
            branchRoot = transform;
        }

        // true 代表包含目前未啟用的子物件。
        branchInteractables =
            branchRoot.GetComponentsInChildren<XRBaseInteractable>(true);

        originalEnabledStates =
            new bool[branchInteractables.Length];

        for (int i = 0; i < branchInteractables.Length; i++)
        {
            originalEnabledStates[i] =
                branchInteractables[i].enabled;
        }

        initialized = true;

        Debug.Log(
            $"BranchInteractionGate 找到 {branchInteractables.Length} 個支線互動元件。",
            this
        );
    }

    /// <summary>
    /// 關閉所有支線互動，但不隱藏物件。
    /// </summary>
    public void LockBranches()
    {
        Initialize();

        foreach (XRBaseInteractable interactable in branchInteractables)
        {
            if (interactable != null)
            {
                interactable.enabled = false;
            }
        }

        IsLocked = true;
        Debug.Log("支線互動已鎖定。", this);
    }

    /// <summary>
    /// 劇情播放完成後，恢復所有支線互動。
    /// </summary>
    public void UnlockBranches()
    {
        Initialize();

        for (int i = 0; i < branchInteractables.Length; i++)
        {
            if (branchInteractables[i] != null)
            {
                branchInteractables[i].enabled =
                    originalEnabledStates[i];
            }
        }

        IsLocked = false;
        Debug.Log("支線互動已解鎖。", this);
    }
}