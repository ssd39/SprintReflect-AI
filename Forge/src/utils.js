import { fetch } from "@forge/api";

export function getSurveyGenKey(issueId) {
  return `${issueId}_surveygen`;
}

export function getSurveyQuestionsKey(issueId) {
  return `${issueId}_surveyquestions`;
}

export function getSprintAvgSpKey() {
  return `acc_avg_sp`;
}

export function getTotalSprintKey() {
  return `acc_total_sprint`;
}

export function getStartTimeKey(issueId) {
  return `${issueId}_intermediate_st`;
}

export function getProjectSprintsKey(projectId) {
  return `project_${projectId}`;
}

export function getSprintDataKey(sprintId) {
  return `sprint_${sprintId}`;
}

export function getSprintsByProjectKey(projectId) {
  return `sprint_${projectId}`;
}

export const getFiledId = (data, name) => {
  for (let record of data) {
    if (record.name == name) {
      return record.id;
    }
  }
  return "";
};

export function todaysDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1; // Months start at 0!
  let dd = today.getDate();

  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;

  const formattedToday = dd + "/" + mm + "/" + yyyy;
  return formattedToday;
}

export async function callWorker(payload) {
  await fetch("https://sprint-reflect-ai.onrender.com/gpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
