import { useEffect, useState } from "react";
import Spinner from "@atlaskit/spinner";
import "./ReportView.css";
import { router } from "@forge/bridge";
import TableTree, {
  Cell,
  Header,
  Headers,
  Row,
  Rows,
} from "@atlaskit/table-tree";
import { invoke } from "@forge/bridge";
import Badge from "@atlaskit/badge";
import Button from "@atlaskit/button";
import { Box } from "@atlaskit/primitives";
import Avatar from "@atlaskit/avatar";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default ({ sprintId, name }) => {
  const [loader, setLoader] = useState(true);
  const [sprintData, setSprintData] = useState({});
  const [teamText, setTeamText] = useState([]);
  const [admireText, setAdmireText] = useState([]);
  const [issues, setIssues] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "Story Points Distribution",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        data: [],
      },
    ],
  });

  const options = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  const getTextFormatArr = (inputText) => {
    let outputText = [];
    let last = -1;
    let bufff = "";
    for (let i = 0; i < inputText.length; i++) {
      if (inputText[i] == "*") {
        if (last == -1) {
          last = i;
          if (bufff != "") {
            outputText.push({ text: bufff, isSpecial: false });
            bufff = "";
          }
        } else {
          if (bufff != "") {
            outputText.push({ text: bufff, isSpecial: true });
            bufff = "";
          }
          last = -1;
        }
      } else {
        bufff += inputText[i];
      }
    }
    return outputText;
  };

  useEffect(() => {
    invoke("getSprintData", { sprintId }).then((sprintData_) => {
      let issues_ = Object.keys(sprintData_.issue_summary).map((val, key) => {
        return {
          id: `item_${val}`,
          issue: sprintData_.issues[val].key,
          assigne: sprintData_.issues[val].assignee,
          childData: null,
          hasChildren: true,
          children: [
            {
              id: `children_${val}`,
              childData: sprintData_.issue_summary[val],
              hasChildren: false,
            },
          ],
        };
      });
      setIssues(issues_);
      let labels = Object.keys(sprintData_.participants).map((val, index) => {
        return sprintData_.participants[val].name;
      });
      let spWorkArr = Object.keys(sprintData_.participants).map(
        (val, index) => {
          return sprintData_.participants[val].sp;
        }
      );
      setChartData((old) => {
        old.datasets[0].data = spWorkArr;
        return {
          ...old,
          labels,
        };
      });
      setTeamText(getTextFormatArr(sprintData_.summary.team_text));
      setAdmireText(getTextFormatArr(sprintData_.summary.admire_text));
      setSprintData(sprintData_);
      setLoader(false);
    });
  }, []);
  return (
    <>
      <span style={{ fontSize: 22, fontWeight: "bold", color: "#172B4D" }}>
        {name}
      </span>
      {loader && (
        <div
          style={{
            width: "100%",
            height: "80%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spinner size={80} />
        </div>
      )}
      {!loader && (
        <>
          <div
            style={{
              display: "flex",
              marginTop: 38,
              marginBottom: 38,
              flexDirection: "column",
            }}
          >
            <div>
              <span
                style={{ fontSize: 18, fontWeight: "bold", color: "#172B4D" }}
              >
                Team Summary
              </span>
              <ul>
                <li>
                  {teamText.map((val, key) => {
                    if (val.isSpecial) {
                      return <Badge>{val.text}</Badge>;
                    } else {
                      return <>{val.text}</>;
                    }
                  })}
                </li>
                <li>
                  {admireText.map((val, key) => {
                    if (val.isSpecial) {
                      return <Badge>{val.text}</Badge>;
                    } else {
                      return <>{val.text}</>;
                    }
                  })}
                </li>
                <li style={{ height: 300 }}>
                  <Bar
                    style={{ marginTop: 5 }}
                    data={chartData}
                    options={options}
                  />
                </li>
              </ul>
            </div>
            <div style={{ marginTop: 10 }}>
              <span
                style={{ fontSize: 18, fontWeight: "bold", color: "#172B4D" }}
              >
                Retrospective Summary
              </span>
              <div style={{ marginTop: 20 }}>
                <table className="customTable tablecss">
                  <thead style={{ height: 35 }}>
                    <th
                      className="headCol tablecss"
                      style={{ backgroundColor: "#66FF99" }}
                    >
                      What Went Well?
                    </th>
                    <th
                      className="headCol tablecss"
                      style={{ backgroundColor: "#FFCCCB" }}
                    >
                      What Went Wrong?
                    </th>
                    <th
                      className="headCol tablecss"
                      style={{ backgroundColor: "#d3d3d3" }}
                    >
                      Improvements
                    </th>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="tablecss" style={{ verticalAlign: "top" }}>
                        <ul>
                          {sprintData.summary.keyPoints.whatWentWell.map(
                            (val, key) => {
                              return <li style={{ marginTop: 10 }}>{val}</li>;
                            }
                          )}
                        </ul>
                      </td>
                      <td className="tablecss" style={{ verticalAlign: "top" }}>
                        <ul>
                          {sprintData.summary.keyPoints.whatWentWrong.map(
                            (val, key) => {
                              return <li style={{ marginTop: 10 }}>{val}</li>;
                            }
                          )}
                        </ul>
                      </td>
                      <td className="tablecss" style={{ verticalAlign: "top" }}>
                        <ul>
                          {sprintData.summary.keyPoints.improvements.map(
                            (val, key) => {
                              return <li style={{ marginTop: 10 }}>{val}</li>;
                            }
                          )}
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ marginTop: 20 }}>
              <span
                style={{ fontSize: 18, fontWeight: "bold", color: "#172B4D" }}
              >
                Detail Analysis
              </span>
              <div style={{ width: "75%" }}>
                <TableTree>
                  <Headers>
                    <Header width={"25%"}>Issue</Header>
                    <Header width={"75%"}>Assignee</Header>
                  </Headers>
                  <Rows
                    items={issues}
                    render={({
                      id,
                      issue,
                      assigne,
                      childData,
                      children = [],
                    }) =>
                      childData !== null ? (
                        <>
                          <table className="customTable tablecss">
                            <thead style={{ height: 35 }}>
                              <th
                                className="headCol tablecss"
                                style={{ backgroundColor: "#66FF99" }}
                              >
                                What Went Well?
                              </th>
                              <th
                                className="headCol tablecss"
                                style={{ backgroundColor: "#FFCCCB" }}
                              >
                                What Went Wrong?
                              </th>
                              <th
                                className="headCol tablecss"
                                style={{ backgroundColor: "#d3d3d3" }}
                              >
                                Improvements
                              </th>
                            </thead>
                            <tbody>
                              <tr>
                                <td
                                  className="tablecss"
                                  style={{ verticalAlign: "top" }}
                                >
                                  <ul>
                                    {childData.retrospectiveSummary.whatWentWell.map(
                                      (val, key) => {
                                        return (
                                          <li style={{ marginTop: 10 }}>
                                            {val}
                                          </li>
                                        );
                                      }
                                    )}
                                  </ul>
                                </td>
                                <td
                                  className="tablecss"
                                  style={{ verticalAlign: "top" }}
                                >
                                  <ul>
                                    {childData.retrospectiveSummary.whatWentWrong.map(
                                      (val, key) => {
                                        return (
                                          <li style={{ marginTop: 10 }}>
                                            {val}
                                          </li>
                                        );
                                      }
                                    )}
                                  </ul>
                                </td>
                                <td
                                  className="tablecss"
                                  style={{ verticalAlign: "top" }}
                                >
                                  <ul>
                                    {childData.retrospectiveSummary.improvements.map(
                                      (val, key) => {
                                        return (
                                          <li style={{ marginTop: 10 }}>
                                            {val}
                                          </li>
                                        );
                                      }
                                    )}
                                  </ul>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      ) : (
                        <Row
                          itemId={id}
                          items={children}
                          hasChildren={children.length > 0}
                        >
                          <Cell singleLine>
                            <Button
                              onClick={() => {
                                router.navigate(`/browse/${issue}`);
                              }}
                              style={{ marginTop: 0, marginBottom: 0 }}
                              appearance="link"
                            >
                              {issue}
                            </Button>
                          </Cell>
                          <Cell singleLine>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <Avatar
                                appearance="circle"
                                src={assigne.avatarUrls["16x16"]}
                                size="small"
                                name={assigne.displayName}
                              />
                              <span style={{ marginLeft: 5 }}>
                                {assigne.displayName}
                              </span>
                            </div>
                          </Cell>
                        </Row>
                      )
                    }
                  />
                </TableTree>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
