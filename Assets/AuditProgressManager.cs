using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class AuditProgressManager : MonoBehaviour
{
    public static AuditProgressManager Instance
    {
        get;
        private set;
    }


    [Header("進度 UI，可不填")]
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


    private void Awake()
    {
        if (
            Instance != null &&
            Instance != this
        )
        {
            Destroy(gameObject);
            return;
        }


        Instance = this;
    }


    private void Start()
    {
        RefreshUI();
    }


    public void MarkCompleted(
        AuditQuestionKey key)
    {
        completedQuestions.Add(
            key
        );


        RefreshUI();
    }


    private int CountStage(
        int stageNo)
    {
        int count = 0;


        foreach (
            AuditQuestionKey key
            in completedQuestions)
        {
            if (
                GetStage(key) ==
                stageNo
            )
            {
                count++;
            }
        }


        return count;
    }


    private int GetStage(
        AuditQuestionKey key)
    {
        switch (key)
        {
            case AuditQuestionKey.SupervisorBadge:
            case AuditQuestionKey.ExpiredPass:
            case AuditQuestionKey.UsbDrive:
            case AuditQuestionKey.ManagementReview:
            case AuditQuestionKey.EmployeeEvaluation:
                return 1;


            case AuditQuestionKey.Tablet:
            case AuditQuestionKey.VisitorCard:
            case AuditQuestionKey.Coffee:
            case AuditQuestionKey.InternalDocument:
            case AuditQuestionKey.EmploymentContract:
                return 2;


            case AuditQuestionKey.PasswordNote:
            case AuditQuestionKey.Ewaste:
            case AuditQuestionKey.Cake:
            case AuditQuestionKey.SecurityPoster:
            case AuditQuestionKey.MaintenanceRecord:
                return 3;
        }


        return 0;
    }


    private void RefreshUI()
    {
        int stage1 =
            CountStage(1);

        int stage2 =
            CountStage(2);

        int stage3 =
            CountStage(3);

        int total =
            completedQuestions.Count;


        if (
            stage1ProgressText != null
        )
        {
            stage1ProgressText.text =
                $"{stage1}/5";
        }


        if (
            stage2ProgressText != null
        )
        {
            stage2ProgressText.text =
                $"{stage2}/5";
        }


        if (
            stage3ProgressText != null
        )
        {
            stage3ProgressText.text =
                $"{stage3}/5";
        }


        if (
            totalProgressText != null
        )
        {
            totalProgressText.text =
                $"{total}/15";
        }


        Debug.Log(
            $"📊 第一站 {stage1}/5 | 第二站 {stage2}/5 | 第三站 {stage3}/5 | 總進度 {total}/15"
        );
    }
}