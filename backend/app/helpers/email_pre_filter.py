
import re


# Only highly recognizable job-advertisement subjects.
AD_PATTERNS = [
    r"^apply now\b",
    r"^new jobs? matching\b",
    r"^recommended jobs?\b",
    r"^suggested jobs?\b",
    r"^jobs? you may like\b",
    r"^your (daily|weekly) job alert\b",
    r"^job alerts?\s*[:\-]",
    r"^we found (a|some) jobs?\b",
]

# Evidence that the message might concern an existing application.
# If any is present, let Qwen examine the message.
APPLICATION_SIGNALS = [
    "thank you for applying",
    "application received",
    "your application",
    "we received your application",
    "interview invitation",
    "votre candidature",
    "candidature reçue",
    "uw sollicitatie",
]


def should_skip_pre_llm(
    sender: str,
    subject: str,
    snippet: str,
) -> bool:
    """Reject only clearly irrelevant job advertisements."""

    normalized_subject = " ".join(
        subject.casefold().split()
    )

    context = (
        normalized_subject + " " + snippet.casefold()
    )

    # Preserve messages with signs of an actual application.
    if any(
        signal in context
        for signal in APPLICATION_SIGNALS
    ):
        return False

    # Sender alone is not used to reject messages:
    # recruitment platforms also send genuine updates.
    return any(
        re.search(pattern, normalized_subject)
        for pattern in AD_PATTERNS
    )
