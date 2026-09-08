using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class AuditProgressManager : MonoBehaviour
{
    public static AuditProgressManager Instance { get; private set; }


    [Header("完成度文字（沒有的可以留空）")]

    [SerializeField]
    private TMP_Text stage1ProgressText;

    [SerializeField]
    private TMP_Text stage2ProgressText;

    [SerializeField]
    private TMP_Text stage3ProgressText;

    [SerializeField]
    private TMP_Text totalProgressText;


    private readonly HashSet<AuditQuestionKey>
        completedQuestions =
            new HashSet<AuditQuestionKey>();


    private const int StageTotal = 5;
    private const int TotalQuestions = 15;


    private void Awake()
{
    if (Instance != null && Instance != this)
    {
        Destroy(gameObject);
        return;
    }

    Instance = this;

    Debug.Log("✅ AuditProgressManager 已啟動");
}


    private void Start()
    {
        UpdateProgressUI();
    }


    // =========================================
    // API 成功後呼叫
    // =========================================
    public void MarkCompleted(
        AuditQuestionKey questionKey)
    {
        // HashSet：
        // 同一個支線不會重複 +1
        bool isNew =
            completedQuestions.Add(questionKey);


        if (!isNew)
        {
            Debug.Log(
                $"ℹ️ {questionKey} 已經計算過完成度"
            );

            return;
        }


        Debug.Log(
            $"✅ 完成支線：{questionKey}"
        );


        UpdateProgressUI();
    }


    // =========================================
    // 更新 UI
    // =========================================
    private void UpdateProgressUI()
    {
        int stage1 =
            CountStage(1);

        int stage2 =
            CountStage(2);

        int stage3 =
            CountStage(3);


        if (stage1ProgressText != null)
        {
            stage1ProgressText.text =
                $"作答完成度：{stage1}/{StageTotal}";
        }


        if (stage2ProgressText != null)
        {
            stage2ProgressText.text =
                $"作答完成度：{stage2}/{StageTotal}";
        }


        if (stage3ProgressText != null)
        {
            stage3ProgressText.text =
                $"作答完成度：{stage3}/{StageTotal}";
        }


        if (totalProgressText != null)
        {
            totalProgressText.text =
                $"總完成度：{completedQuestions.Count}/{TotalQuestions}";
        }


        Debug.Log(
            $"📊 第一站 {stage1}/5 | " +
            $"第二站 {stage2}/5 | " +
            $"第三站 {stage3}/5 | " +
            $"總進度 {completedQuestions.Count}/15"
        );
    }


    // =========================================
    // 計算某一站完成幾個
    // =========================================
    private int CountStage(int stage)
    {
        int count = 0;

        foreach (
            AuditQuestionKey question
            in completedQuestions)
        {
            if (GetStage(question) == stage)
            {
                count++;
            }
        }

        return count;
    }


    // =========================================
    // Question Key → Stage
    // =========================================
    private int GetStage(
        AuditQuestionKey questionKey)
    {
        switch (questionKey)
        {
            // =============================
            // 第一站
            // =============================
            case AuditQuestionKey.SupervisorBadge:
            case AuditQuestionKey.ExpiredPass:
            case AuditQuestionKey.UsbDrive:
            case AuditQuestionKey.ManagementReview:
            case AuditQuestionKey.EmployeeEvaluation:

                return 1;


            // =============================
            // 第二站
            // =============================
            case AuditQuestionKey.Tablet:
            case AuditQuestionKey.VisitorCard:
            case AuditQuestionKey.Coffee:
            case AuditQuestionKey.InternalDocument:
            case AuditQuestionKey.EmploymentContract:

                return 2;


            // =============================
            // 第三站
            // =============================
            case AuditQuestionKey.PasswordNote:
            case AuditQuestionKey.Ewaste:
            case AuditQuestionKey.Cake:
            case AuditQuestionKey.SecurityPoster:
            case AuditQuestionKey.MaintenanceRecord:

                return 3;
        }

        return 0;
    }


    // =========================================
    // 給 StageManager 使用
    // =========================================
    public int GetStageCompletedCount(int stage)
    {
        return CountStage(stage);
    }


    public int GetTotalCompletedCount()
    {
        return completedQuestions.Count;
    }


    public bool IsStageCompleted(int stage)
    {
        return CountStage(stage) >= StageTotal;
    }


    public bool IsAllCompleted()
    {
        return completedQuestions.Count >=
               TotalQuestions;
    }


    public bool IsCompleted(
        AuditQuestionKey questionKey)
    {
        return completedQuestions.Contains(
            questionKey
        );
    }
}