import ForgeUI, {
  Button,
  Form,
  render,
  SectionMessage,
  Text,
  Fragment,
  IssueActivity,
  useProductContext,
  useEffect,
  useState,
  Strong,
  Image,
  TextField,
  Heading,
} from "@forge/ui";
import { storage, webTrigger } from "@forge/api";
import quotes from "./quotes.json";
import {  getSprintDataKey, getSurveyGenKey, getSurveyQuestionsKey, getProjectSprintsKey } from "./utils";
import { Queue } from '@forge/events';

const PlaceHolder = ({ isProcessing }) => {
  const [quoteId, setQuotes] = useState(
    Math.floor(Math.random() * quotes.motivationalQuotes.length)
  );
  return (
    <Fragment>
      <SectionMessage
        title={
          isProcessing ? "Analysing data" : "Waiting for issue to be completed"
        }
        appearance="info"
      ></SectionMessage>
      {isProcessing && (
        <Image src="https://s6.gifyu.com/images/S6FJt.gif" size="medium" />
      )}
      {!isProcessing && (
        <Image src="https://s6.gifyu.com/images/S6FJ5.gif" size="medium" />
      )}
      <Text>
        "{quotes.motivationalQuotes[quoteId].quote}" 
        <Strong>-{quotes.motivationalQuotes[quoteId].author}</Strong>
      </Text>
    </Fragment>
  );
};

const SurveyForm = ({ surveyObj }) => {
const [isShwow, setShow] = useState(true)
  const onSubmit = async (formData) => {
    for(let qid in formData){
        const id = parseInt(qid.split("_")[1])
        surveyObj.questions[id].answer = formData[qid]
    }
    setShow(false)
    if(surveyObj.sprintId){
        const sprintData = await storage.get(getSprintDataKey(surveyObj.sprintId))
        sprintData.issue_survey[surveyObj.issueId] = { questions: surveyObj.questions }
        await storage.set(getSprintDataKey(surveyObj.sprintId), sprintData);

        const prompt = `Following is the issue in the sprint of agile working team:

${surveyObj.rawData}

Followin is the survay data of above issue:
        
Now give summary for retororetrospective (what went good, what went wrong, improvments) from above data and also give suggestion what could be done in future or what should learn:
${JSON.stringify(surveyObj.questions)}

output json format schema:
{
  "retrospectiveSummary": {
    "whatWentWell": [
        String
    ],
    "whatWentWrong": [
        String
    ],
    "improvements": [
        String
      ],
  }
}`;
      const webhook = await webTrigger.getUrl("issue-survey-summary");
      const queue = new Queue({ key: 'worker-publish' });

      await queue.push({
        issueId: surveyObj.issueId,
        prompt,
        webhook,
        sprintId: surveyObj.sprintId,
        actionId: 1
      })
    }
    await storage.set(getSurveyQuestionsKey(surveyObj.issueId), surveyObj);
    setShow(true)
  };
 
  return (
    <Fragment>
      <Form onSubmit={onSubmit} submitButtonText={'Save'} submitButtonAppearance={'primary'}>
        {isShwow && surveyObj.questions.map((val, key) => {
          return (
            <Fragment key={key} >
              <Heading size="small">{val.headline}</Heading>
              <Text>{val.question}</Text>
              <TextField name={`question_${key}`} label={""} defaultValue={val?.answer || ""}/>
            </Fragment>
          );
        })}
      </Form>
    </Fragment>
  );
};

const App = () => {
  const context = useProductContext();
  const [status, setStatus] = useState("PENDING");
  const [surveyObj, setSurveyObj] = useState(null);

  useEffect(async () => {
    const status = await storage.get(
      getSurveyGenKey(context.platformContext.issueId)
    );
    if (status === "IN_PROGRESS") {
      setStatus("IN_PROGRESS");
    } else if (status === "DONE") {
      const dataObj = await storage.get(
        getSurveyQuestionsKey(context.platformContext.issueId)
      );
      setStatus("DONE");
      setSurveyObj(dataObj);
    }
  }, []);

  return (
    <Fragment>
      {status == "DONE" && surveyObj!== null && <SurveyForm surveyObj={surveyObj}  />}
      {status != "DONE" && (
        <PlaceHolder isProcessing={status=="IN_PROGRESS"} />
      )}
    </Fragment>
  );
};

export const run = render(
  <IssueActivity>
    <App />
  </IssueActivity>
);
