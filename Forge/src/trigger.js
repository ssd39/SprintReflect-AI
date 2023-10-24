import { getStartTimeKey, getSurveyGenKey, getFiledId } from "./utils";
import api, { route, webTrigger, storage } from "@forge/api";
import { Queue } from '@forge/events';

const getIssueDescText = (contents) => {
  let desc = "";
  for (let x of contents) {
    if (x.hasOwnProperty("content")) {
      desc += getIssueDescText(x.content);
    } else if (x.hasOwnProperty("text")) {
      desc += x.text;
    }
  }
  return desc;
};

const getComments = (comments) => {
  let res = "";
  for (let comment of comments) {
    const author = comment.author.displayName;
    const text = getIssueDescText(comment.body.content);
    res += ` -${author}: ${text}\n`;
  }
  if (res != "") {
    res = "\nComments:\n" + res;
  }
  return res;
};



export const run = async (data) => {
  
const s = Date.now()
  const surveyGenStatus = await storage.get(getSurveyGenKey(data.issue.id));
  /*if (surveyGenStatus === "IN_PROGRESS" || surveyGenStatus === "DONE") {
    return;
  }*/
  const queue_ = new Queue({ key: 'sprint-parse' });
  const taskId = await queue_.push({
    issueId: data.issue.id
  })

  if (data.issue.fields.status.statusCategory.key != "done") {
    for (let item of data.changelog.items) {
      if (item.field == "status") {
        const issueStartDate = await storage.get(
          getStartTimeKey(data.issue.id)
        );
        if (!issueStartDate) {
          await storage.set(
            getStartTimeKey(data.issue.id),
            data.issue.fields.updated.split("T")[0]
          );
        }
      }
    }
    return;
  }

  const getFieldsRes = await api.asApp().requestJira(route`/rest/api/3/field`, {
    headers: {
      Accept: "application/json",
    },
  });
  const fieldsData = await getFieldsRes.json();
  const storyPointFieldId = getFiledId(fieldsData, "Story point estimate")
  const sprintFieldId = getFiledId(fieldsData, "Sprint")

  const response = await api
    .asApp()
    .requestJira(route`/rest/api/3/issue/${data.issue.id}?fields=summary,description,updated,duedate,${storyPointFieldId},project,${sprintFieldId},comment`, {
      headers: {
        Accept: "application/json",
      },
    });

  const issueData = await response.json();
  //const issueKey = issueData.key
  const title = issueData.fields.summary;
  const desc = getIssueDescText(issueData.fields?.description?.content || []);
  const completionDate = issueData.fields.updated.split("T")[0];
  const dueDate = issueData.fields?.duedate;
  let storyPoint =
    issueData.fields[storyPointFieldId];
  const issueStartDate = await storage.get(getStartTimeKey(data.issue.id));
  const sprint_list = issueData.fields[sprintFieldId];
  const projectId = issueData.fields.project.id;
  //const accId = issueData.fields.assignee.accountId
  //const displayName = issueData.fields.assignee.displayName
  let sprint;
  let sprintId;
  let sprintName = '';
  if (sprint_list.length > 0) {
    sprint = sprint_list[0];
    sprintId = `${projectId}_${sprint.id}`;
    sprintName = sprint.name
  }

  let dates_prompt_text = "";
  if (dueDate !== undefined) {
    dates_prompt_text += `\nIssue Estimated completion date: ${dueDate}\nIssue Actual completion date: ${completionDate}`;
  }

  let story_point_text = "";
  if (storyPoint) {
    story_point_text += `\nStory point: ${storyPoint}`;
  } else {
    storyPoint = 0
  }

  let sprint_dates_text = "";
  if (sprint) {
    sprint_dates_text += `\nSprint start date-time: ${sprint.startDate}\nSprint end date-time: ${sprint.endDate}`;
  }

  let issue_start_date = "";
  if (issueStartDate) {
    issue_start_date += `\nIssue Start date: ${issueStartDate}`;
  }

  let comments_text = getComments(issueData.fields.comment.comments);

  const rawData = `Title: ${title}
Description: ${desc}
${story_point_text}${issue_start_date}${dates_prompt_text}${sprint_dates_text}${comments_text}`
  
  const prompt = `You are analysing sprint following are details related to issue in sprint. Your task is to create minimal effective survey from given issue  data (use context of given data) and ask the developer in such manner to understand what went wrong during the development of card.

${rawData}

output format json schema:
{
  "survey": {
    "headline": String,
    "questions": [
      {
        "question": String,
        "headline": String
      }
    ]
  }
}
output questions should be minimal(max 5-6, not fix limit of 5-6) but effective and important questions only.`;
  const webhook = await webTrigger.getUrl("issue-survey-data");
  const queue = new Queue({ key: 'worker-publish' });
  await storage.set(getSurveyGenKey(data.issue.id), "IN_PROGRESS");
  await queue.push({
    issueId: data.issue.id,
    prompt,
    webhook,
    sprintId,
    rawData,
    actionId: 0,
    storyPoint
  })
};
