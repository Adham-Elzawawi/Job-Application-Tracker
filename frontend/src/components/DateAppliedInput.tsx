
"use client";

import { useEffect, useState } from "react";
import styles from "@/styles/AddApplication.module.css";

export default function DateAppliedInput() {
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    // Use the user's local date, not UTC.
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    setDate(`${year}-${month}-${day}`);
    setToday(`${year}-${month}-${day}`);
  }, []);

  return (
    <input
      id="applied_at"
      name="applied_at"
      type="date"
      className={styles.input}
      value={date}
      onChange={(event) => setDate(event.target.value)}
      max={today || undefined} // Prevents selecting a date after today
    />
  );
}
