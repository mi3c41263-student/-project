using UnityEngine;

public class DocumentPopupViewer : MonoBehaviour
{
    [Header("要顯示的放大文件")]
    [SerializeField] private GameObject viewObject;

    [Header("VR 頭部相機")]
    [SerializeField] private Transform headCamera;

    [Header("文件與頭部距離")]
    [SerializeField] private float distanceFromCamera = 0.65f;

    [Header("上下位置微調")]
    [SerializeField] private float heightOffset = -0.05f;

    [Header("文件旋轉修正")]
    [SerializeField] private Vector3 rotationOffset = Vector3.zero;

    [Header("開啟後是否跟隨頭部")]
    [SerializeField] private bool followHead = true;

    [Header("放開文件後是否恢復跟隨")]
    [SerializeField] private bool resumeFollowAfterRelease = false;

    private bool isBeingGrabbed;
    private bool hasBeenGrabbed;

    private void Start()
    {
        if (viewObject != null)
        {
            viewObject.SetActive(false);
        }

        FindHeadCamera();
    }

    private void LateUpdate()
    {
        if (!followHead ||
            viewObject == null ||
            !viewObject.activeSelf ||
            isBeingGrabbed)
        {
            return;
        }

        // 未勾選恢復跟隨時，第一次拿取後便不再強制跟隨。
        if (hasBeenGrabbed && !resumeFollowAfterRelease)
        {
            return;
        }

        PlaceInFrontOfCamera();
    }

    public void ToggleView()
    {
        if (viewObject == null)
        {
            Debug.LogWarning("DocumentPopupViewer 尚未指定 View Object。", this);
            return;
        }

        bool shouldShow = !viewObject.activeSelf;
        viewObject.SetActive(shouldShow);

        if (shouldShow)
        {
            FindHeadCamera();

            isBeingGrabbed = false;
            hasBeenGrabbed = false;

            PlaceInFrontOfCamera();
        }
    }

    public void HideView()
    {
        if (viewObject != null)
        {
            viewObject.SetActive(false);
        }

        isBeingGrabbed = false;
        hasBeenGrabbed = false;
    }

    // 接到 View 的 XR Grab Interactable → Select Entered
    public void OnViewGrabStarted()
    {
        isBeingGrabbed = true;
        hasBeenGrabbed = true;
    }

    // 接到 View 的 XR Grab Interactable → Select Exited
    public void OnViewGrabEnded()
    {
        isBeingGrabbed = false;
    }

    private void FindHeadCamera()
    {
        if (headCamera == null && Camera.main != null)
        {
            headCamera = Camera.main.transform;
        }
    }

    private void PlaceInFrontOfCamera()
    {
        if (headCamera == null || viewObject == null)
        {
            return;
        }

        Vector3 targetPosition =
            headCamera.position +
            headCamera.forward * distanceFromCamera +
            headCamera.up * heightOffset;

        viewObject.transform.position = targetPosition;

        viewObject.transform.rotation =
            Quaternion.LookRotation(
                viewObject.transform.position - headCamera.position,
                headCamera.up
            ) * Quaternion.Euler(rotationOffset);
    }
}