
export async function getApplications(
  userId: string
) {
  try {
    const response = await fetch(
      `http://localhost:8000/applications/${userId}`
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
    });

  } catch (error) {
    console.error("Failed to fetch applications:", error);

    return Response.json(
      { error: "Failed to fetch application data" },
      { status: 500 }
    );
  }
}
