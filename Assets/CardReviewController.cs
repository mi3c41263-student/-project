using UnityEngine;
using UnityEngine.Events;

public class CardReviewController : MonoBehaviour
{
    public enum Answer
    {
        Unanswered,
        Yes,
        No
    }

    [Header("VR 頭部相機")]
    [SerializeField] private Transform headCamera;

    [Header("整個眼前檢視區")]
    [SerializeField] private GameObject reviewRoot;

    [Header("卡片在檢視區中的定位點")]
    [SerializeField] private Transform cardViewTarget;

    [Header("顯示距離")]
    [SerializeField] private float distanceFromCamera = 0.65f;

    [Header("上下位置微調")]
    [SerializeField] private float heightOffset = -0.05f;

    [Header("整個檢視區旋轉微調")]
    [SerializeField] private Vector3 reviewRotationOffset = Vector3.zero;

    [Header("卡片在眼前的放大倍率")]
    [SerializeField] private float viewScaleMultiplier = 2f;

    [Header("目前答案，只在 ResetAnswer 時清除")]
    [SerializeField] private Answer currentAnswer = Answer.Unanswered;

    [Header("選擇 A：是，未來可接提示框")]
    [SerializeField] private UnityEvent onChooseYes;

    [Header("選擇 B：不是，未來可接提示框")]
    [SerializeField] private UnityEvent onChooseNo;

    public Answer CurrentAnswer => currentAnswer;
    public bool IsReviewOpen => isReviewOpen;

    private bool isReviewOpen;

    private Transform originalParent;
    private Vector3 originalLocalPosition;
    private Quaternion originalLocalRotation;
    private Vector3 originalLocalScale;
    private Vector3 originalWorldScale;

    private void Awake()
    {
        if (reviewRoot != null)
        {
            reviewRoot.SetActive(false);
        }

        FindHeadCamera();
    }

    /// <summary>
    /// 點擊原始卡片時，將卡片移到眼前。
    /// </summary>
    public void OpenReview()
    {
        if (isReviewOpen)
        {
            return;
        }

        if (reviewRoot == null || cardViewTarget == null)
        {
            Debug.LogWarning(
                $"{gameObject.name} 尚未指定 Review Root 或 Card View Target。",
                this
            );
            return;
        }

        FindHeadCamera();

        if (headCamera == null)
        {
            Debug.LogWarning("找不到 VR Main Camera。", this);
            return;
        }

        SaveOriginalTransform();

        PositionReviewRoot();

        reviewRoot.SetActive(true);

        // 暫時把卡片放到眼前的 CardViewTarget 底下。
        transform.SetParent(cardViewTarget, false);
        transform.localPosition = Vector3.zero;
        transform.localRotation = Quaternion.identity;

        // 保持原本世界尺寸，再套用放大倍率。
        Vector3 targetWorldScale =
            originalWorldScale * viewScaleMultiplier;

        transform.localScale = DivideScale(
            targetWorldScale,
            cardViewTarget.lossyScale
        );

        isReviewOpen = true;
    }

    /// <summary>
    /// 點擊空白背景時，卡片回到原位。
    /// 不會清除答案。
    /// </summary>
    public void CloseReview()
    {
        if (!isReviewOpen)
        {
            return;
        }

        transform.SetParent(originalParent, false);
        transform.localPosition = originalLocalPosition;
        transform.localRotation = originalLocalRotation;
        transform.localScale = originalLocalScale;

        if (reviewRoot != null)
        {
            reviewRoot.SetActive(false);
        }

        isReviewOpen = false;
    }

    /// <summary>
    /// 未來 A. 是 按鈕呼叫。
    /// </summary>
    public void ChooseYes()
    {
        currentAnswer = Answer.Yes;

        Debug.Log(
            $"{gameObject.name}：已紀錄答案 A. 是",
            this
        );

        onChooseYes?.Invoke();
    }

    /// <summary>
    /// 未來 B. 不是 按鈕呼叫。
    /// </summary>
    public void ChooseNo()
    {
        currentAnswer = Answer.No;

        Debug.Log(
            $"{gameObject.name}：已紀錄答案 B. 不是",
            this
        );

        onChooseNo?.Invoke();
    }

    /// <summary>
    /// 只有開始新一輪題目時才呼叫。
    /// </summary>
    public void ResetAnswer()
    {
        currentAnswer = Answer.Unanswered;
    }

    private void SaveOriginalTransform()
    {
        originalParent = transform.parent;
        originalLocalPosition = transform.localPosition;
        originalLocalRotation = transform.localRotation;
        originalLocalScale = transform.localScale;
        originalWorldScale = transform.lossyScale;
    }

    private void PositionReviewRoot()
    {
        Vector3 targetPosition =
            headCamera.position +
            headCamera.forward * distanceFromCamera +
            headCamera.up * heightOffset;

        Quaternion targetRotation =
            headCamera.rotation *
            Quaternion.Euler(reviewRotationOffset);

        reviewRoot.transform.SetPositionAndRotation(
            targetPosition,
            targetRotation
        );
    }

    private void FindHeadCamera()
    {
        if (headCamera == null && Camera.main != null)
        {
            headCamera = Camera.main.transform;
        }
    }

    private static Vector3 DivideScale(
        Vector3 worldScale,
        Vector3 parentWorldScale
    )
    {
        return new Vector3(
            SafeDivide(worldScale.x, parentWorldScale.x),
            SafeDivide(worldScale.y, parentWorldScale.y),
            SafeDivide(worldScale.z, parentWorldScale.z)
        );
    }

    private static float SafeDivide(float value, float divisor)
    {
        return Mathf.Abs(divisor) > 0.00001f
            ? value / divisor
            : value;
    }
}
