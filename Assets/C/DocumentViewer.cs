using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

public class DocumentViewer : MonoBehaviour
{
    public Transform tableAnchor;      // 拖入桌上的原位點
    public Transform eyeAnchor;        // 拖入 Camera 前方的目標點
    public float moveSpeed = 5f;       // 移動速度

    private bool isInspecting = false;
    private Vector3 targetPosition;
    private Quaternion targetRotation;

    void Start()
    {
        // 初始狀態在桌上
        targetPosition = tableAnchor.position;
        targetRotation = tableAnchor.rotation;
    }

    void Update()
    {
        // 每一幀平滑移動與旋轉（非一瞬間閃現）
        transform.position = Vector3.Lerp(transform.position, targetPosition, Time.deltaTime * moveSpeed);
        transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * moveSpeed);
    }

    // 當雷射線點選文件時觸發（由 XR 互動事件呼叫）
    public void ToggleInspect()
    {
        isInspecting = !isInspecting;

        if (isInspecting)
        {
            targetPosition = eyeAnchor.position;
            targetRotation = eyeAnchor.rotation;
        }
        else
        {
            targetPosition = tableAnchor.position;
            targetRotation = tableAnchor.rotation;
        }
    }
}