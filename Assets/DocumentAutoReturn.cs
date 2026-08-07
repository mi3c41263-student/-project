using System.Collections;
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit.Interactables;

public class DocumentAutoReturn : MonoBehaviour
{
    [Header("要回原位的文件本體")]
    [Tooltip("通常填這個腳本所在的文件 View。如果空著，會自動使用自己。")]
    public Transform documentTransform;

    [Header("回原位後是否隱藏")]
    [Tooltip("如果你的文件 View 是放大查看用的副本，建議勾選。")]
    public bool hideAfterReturn = true;

    [Header("回原位延遲秒數")]
    [Tooltip("點到缺失後，等幾秒再回原位。建議 0.3~0.8。")]
    public float returnDelay = 0.5f;

    [Header("是否回復原本縮放")]
    public bool restoreScale = true;

    private Transform originalParent;
    private Vector3 originalLocalPosition;
    private Quaternion originalLocalRotation;
    private Vector3 originalLocalScale;

    private Rigidbody rb;
    private XRGrabInteractable grabInteractable;

    private Coroutine returnCoroutine;

    private void Awake()
    {
        if (documentTransform == null)
        {
            documentTransform = transform;
        }

        originalParent = documentTransform.parent;
        originalLocalPosition = documentTransform.localPosition;
        originalLocalRotation = documentTransform.localRotation;
        originalLocalScale = documentTransform.localScale;

        rb = documentTransform.GetComponent<Rigidbody>();
        grabInteractable = documentTransform.GetComponent<XRGrabInteractable>();
    }

    /// <summary>
    /// 給 CorrectPoint_Hotspot 的事件呼叫。
    /// 點到缺失處後，文件會回到原本位置。
    /// </summary>
    public void ReturnDocument()
    {
        if (returnCoroutine != null)
        {
            StopCoroutine(returnCoroutine);
        }

        returnCoroutine = StartCoroutine(ReturnRoutine());
    }

    private IEnumerator ReturnRoutine()
    {
        yield return new WaitForSeconds(returnDelay);

        if (grabInteractable != null)
        {
            grabInteractable.enabled = false;
        }

        if (rb != null)
        {
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
            rb.isKinematic = true;
            rb.useGravity = false;
        }

        documentTransform.SetParent(originalParent, false);
        documentTransform.localPosition = originalLocalPosition;
        documentTransform.localRotation = originalLocalRotation;

        if (restoreScale)
        {
            documentTransform.localScale = originalLocalScale;
        }

        yield return null;

        if (grabInteractable != null)
        {
            grabInteractable.enabled = true;
        }

        if (hideAfterReturn)
        {
            documentTransform.gameObject.SetActive(false);
        }

        returnCoroutine = null;
    }

    /// <summary>
    /// 如果你想手動更新目前位置為新的原位，可以按鈕或其他腳本呼叫這個。
    /// 一般不用。
    /// </summary>
    public void SaveCurrentAsOriginalPosition()
    {
        originalParent = documentTransform.parent;
        originalLocalPosition = documentTransform.localPosition;
        originalLocalRotation = documentTransform.localRotation;
        originalLocalScale = documentTransform.localScale;
    }
}