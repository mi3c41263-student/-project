SELECT
    ua.id,
    ua.user_id,
    ua.question_id,
    q.question_text,
    ua.selected_option,
    ua.is_correct,
    ua.score
FROM user_answers ua
JOIN questions q
    ON ua.question_id = q.id
WHERE ua.user_id = 64
ORDER BY ua.id DESC;