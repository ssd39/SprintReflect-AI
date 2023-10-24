import Resolver from "@forge/resolver";
import { callWorker } from "./utils";
import api, { route, storage, webTrigger } from "@forge/api";
import { getSprintDataKey, getFiledId, getProjectSprintsKey } from "./utils";
import { Queue } from '@forge/events';

const resolver = new Resolver();

resolver.define("worker-publish-listener", async ({ payload, context }) => {
  await callWorker(payload);
});

resolver.define("extract-sprint-listener", async ({ payload, context }) => {
  const issueId = payload.issueId;
  const getFieldsRes = await api.asApp().requestJira(route`/rest/api/3/field`, {
    headers: {
      Accept: "application/json",
    },
  });
  const fieldsData = await getFieldsRes.json();
  const sprintFieldId = getFiledId(fieldsData, "Sprint");
  const storyPointFieldId = getFiledId(fieldsData, "Story point estimate");
  const response = await api
    .asApp()
    .requestJira(
      route`/rest/api/3/issue/${issueId}?fields=summary,project,${sprintFieldId},assignee,${storyPointFieldId},status`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

  const issueData = await response.json();
  const title = issueData.fields?.summary;
  const sprint_list = issueData.fields[sprintFieldId];
  const projectId = issueData.fields.project.id;
  const issueKey = issueData.key;
  const accId = issueData.fields?.assignee?.accountId;
  const displayName = issueData.fields?.assignee?.displayName;
  const issueStatus = issueData.fields.status.statusCategory.key;
  let storyPoint = issueData.fields[storyPointFieldId];
  if (!storyPoint) {
    storyPoint = 0;
  }

  let sprint;
  let sprintId;
  let sprintName = "";
  if (sprint_list && sprint_list.length > 0) {
    sprint = sprint_list[0];
    sprintId = `${projectId}_${sprint.id}`;
    sprintName = sprint.name;
  }
  if (sprintId) {
    let sprintData = await storage.get(getSprintDataKey(sprintId));
    if (sprintData === undefined) {
      sprintData = {
        index: 0,
        issue_survey: {},
        issue_summary: {},
        participants: {},
        issues: {},
      };

      let projectSprints = await storage.get(getProjectSprintsKey(projectId));
      if (!projectSprints) {
        projectSprints = [];
      }
      projectSprints.push({
        id: sprintId,
        name: sprintName,
        status: "NEW",
        createdOn: "",
      });
      sprintData.index = projectSprints.length - 1;
      await storage.set(getProjectSprintsKey(projectId), projectSprints);
      await storage.set(getSprintDataKey(sprintId), sprintData);
    }

    if (accId) {
      if (!sprintData.participants.hasOwnProperty(accId)) {
        sprintData.participants[accId] = {
          name: displayName,
          sp: 0,
          issues: {},
        };
      }
      if (!sprintData.participants[accId].issues.hasOwnProperty(issueId)) {
        sprintData.participants[accId].sp += storyPoint;
        sprintData.participants[accId].issues[issueId] = storyPoint;
      }
    }
    sprintData.issues[issueId] = {
      key: issueKey,
      summary: title,
      sp: storyPoint,
      status: issueStatus,
      assignee: issueData.fields?.assignee,
    };
    await storage.set(getSprintDataKey(sprintId), sprintData);
  }
});

resolver.define("sprint-finish-listener", async ({ payload, context }) => {
  const sprintId = payload.sprintId;
  const projectId = sprintId.split("_")[0]
  const sprintData = await storage.get(getSprintDataKey(sprintId));
  let completedPoints = 0;
  let totalPoints = 0;
  for (let issueId in sprintData.issues) {
    const issue = sprintData.issues[issueId];
    if (issue.status == "done") {
      completedPoints += issue.sp;
    }
    totalPoints += issue.sp;
  }
  let surveyArr = [];
  for (let issueId in sprintData.issue_summary) {
    surveyArr.push(sprintData.issue_summary[issueId]);
  }

  let users = [];
  for (let participantId in sprintData.participants) {
    users.push(sprintData.participants[participantId]);
  }

  users.sort(function (a, b) {
    if (a.sp > b.sp) {
      return -1;
    } else if (a.sp < b.sp) {
      return 1;
    }
    return 0;
  });

  let charming_users_text = ''
  if(users.length >0){
    let last = users[0].sp
    for(let user of users){
      if(user.sp == last) {
        charming_users_text += `${user.name}: ${user.sp} story points\n`
      }
    }
  }else {
    charming_users_text = 'no user contributed'
  }


  const prompt = `${completedPoints} story point cover out of ${totalPoints} in sprint. Use this data and give me text which includes this numerical value and if performance is not good then advise, if performance is average then motivate or if performance is good then praise the team. Output of this will be value of team_text.

Following is the name of members who achived the most story point,Using this data create text to praise them which includes names and numerical value. Output of this will be value of admire_text.
${charming_users_text}

Following is a given list of summary of differnt issues in sprint. From this diifent summary i want you to create key points (max 5-6, not strict requirement of 5-6 point) for what done well, what went wrong and future improvements. 

${JSON.stringify(surveyArr)}

Please format the team_text & admire_text in a way that the names(members name) and numerical values(story points), including the total number (e.g., 120), are enclosed with asterisks at the start and end.
output format json schema:
{
  "team_text": "",
  "admire_text": "",
  "keyPoints": {
    "whatWentWell": [
        String
    ],
    "whatWentWrong": [
        String
    ],
    "improvements": [
        String
    ]
  }
}
  `;
  const webhook = await webTrigger.getUrl("spint-final-summary"); 
  const queue = new Queue({ key: 'worker-publish' });
  await queue.push({
    prompt,
    webhook,
    sprintId,
    actionId: 2
  })
});

export const handler = resolver.getDefinitions();
