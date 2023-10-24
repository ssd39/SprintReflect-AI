import { storage } from "@forge/api";
import {
  getSurveyGenKey,
  getSurveyQuestionsKey,
  getSprintDataKey,
  getProjectSprintsKey,
  todaysDate
} from "./utils";

export const onIssueSurveyData = async (data) => {
  const body = JSON.parse(data.body);
  if (body?.questions.length != 0 && body.issueId) {
    await storage.set(getSurveyQuestionsKey(body.issueId), body);
    await storage.set(getSurveyGenKey(body.issueId), "DONE");
  }
};

export const onIssueSurveySummary = async (data) => {
  const body = JSON.parse(data.body);
  if (body.retro && body.issueId && body.sprintId) {
    const sprintData = await storage.get(getSprintDataKey(body.sprintId));
    if (sprintData) {
      sprintData.issue_summary[body.issueId] = body.retro;
      await storage.set(getSprintDataKey(body.sprintId), sprintData);
    }
  }
};

export const onSprintSurveySummary = async (data) => {
  const body = JSON.parse(data.body);
  if (body.sprintRetro && body.sprintId) {
    const sprintData = await storage.get(getSprintDataKey(body.sprintId));
    if (sprintData) {
      const projectId = body.sprintId.split("_")[0]
      sprintData.summary = body.sprintRetro;
      await storage.set(getSprintDataKey(body.sprintId), sprintData);
      let projectSprints = await storage.get(getProjectSprintsKey(projectId));
      projectSprints[sprintData.index].status = 'READY'
      projectSprints[sprintData.index].createdOn = todaysDate()
      await storage.set(getProjectSprintsKey(projectId), projectSprints);
    }
  }
};
