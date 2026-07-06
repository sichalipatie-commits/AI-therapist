# Emotion label map — must match the alphabetical order used by sklearn's
# LabelEncoder when fit on the valid_emotions list.
# LabelEncoder.fit() sorts classes alphabetically, so label 0 = first
# alphabetically among the 31 valid emotions.

VALID_EMOTIONS = [
    'afraid', 'angry', 'annoyed', 'anticipating', 'anxious',
    'apprehensive', 'ashamed', 'caring', 'confident', 'content',
    'devastated', 'disgusted', 'embarrassed', 'excited', 'faithful',
    'furious', 'grateful', 'guilty', 'hopeful', 'impressed',
    'jealous', 'joyful', 'lonely', 'nostalgic', 'prepared',
    'proud', 'sad', 'sentimental', 'surprised', 'terrified', 'trusting'
]

# id → emotion name  (0-indexed, alphabetically sorted)
ID_TO_EMOTION: dict[int, str] = {i: e for i, e in enumerate(VALID_EMOTIONS)}

# Emoji mapping for UI display
EMOTION_EMOJI: dict[str, str] = {
    'afraid': '😨',
    'angry': '😠',
    'annoyed': '😤',
    'anticipating': '🤩',
    'anxious': '😰',
    'apprehensive': '😟',
    'ashamed': '😳',
    'caring': '🤗',
    'confident': '💪',
    'content': '😌',
    'devastated': '💔',
    'disgusted': '🤢',
    'embarrassed': '😶',
    'excited': '🎉',
    'faithful': '🙏',
    'furious': '🤬',
    'grateful': '🥹',
    'guilty': '😞',
    'hopeful': '🌟',
    'impressed': '😮',
    'jealous': '😒',
    'joyful': '😊',
    'lonely': '😢',
    'nostalgic': '🥺',
    'prepared': '📋',
    'proud': '🦁',
    'sad': '😔',
    'sentimental': '💭',
    'surprised': '😲',
    'terrified': '😱',
    'trusting': '🤝',
}
