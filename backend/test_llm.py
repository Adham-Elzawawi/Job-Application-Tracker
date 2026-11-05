
from app.services.llm import analyze_email

result = analyze_email(
    sender="recruitment@example.com",
    subject="Your Software Engineer application",
    content=(
        "Thank you for applying for the Software Engineer "
        "position at ExampleCorp. We would like to invite "
        "you to an interview next Wednesday."
    ),
)

print(result.model_dump_json(indent=2))
