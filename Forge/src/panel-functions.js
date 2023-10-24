import Resolver from "@forge/resolver";
import { getProjectSprintsKey, getSprintDataKey  } from './utils'
import {  storage } from "@forge/api";
import { Queue } from '@forge/events';

const resolver = new Resolver();

resolver.define("getSprints", async ({ payload, context }) => {
    const projectId = payload.projectId
    const projectSprints = await storage.get(getProjectSprintsKey(projectId))
    return projectSprints.reverse() || []
});

resolver.define("getSprintData", async ({ payload, context }) => {
    const sprintId = payload.sprintId
    const sprintData = await storage.get(getSprintDataKey(sprintId));
    return sprintData || {}
});

resolver.define("generateReport", async ({ payload, context }) => {
    const sprintId = payload.sprintId
    const queue = new Queue({ key: 'sprint-publish' });
    const sprintData = await storage.get(getSprintDataKey(sprintId));
    const projectId = sprintId.split("_")[0]
    let projectSprints = await storage.get(getProjectSprintsKey(projectId));
    projectSprints[sprintData.index].status = 'IN_PROGRESS'
    await storage.set(getProjectSprintsKey(projectId), projectSprints);

    await queue.push({
        sprintId
    })
    return true
})

export const handler = resolver.getDefinitions();



