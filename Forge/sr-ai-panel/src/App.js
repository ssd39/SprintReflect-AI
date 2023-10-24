import React, { useState } from "react";
import "./App.css";
import Lozenge from "@atlaskit/lozenge";
import DynamicTable from "@atlaskit/dynamic-table";
import { Box, xcss } from "@atlaskit/primitives";
import Button, { LoadingButton } from "@atlaskit/button";
import { invoke, view, router } from "@forge/bridge";
import Drawer from "@atlaskit/drawer";
import ReportView from "./ReportView";

const containerStyles = xcss({
  display: "flex",
  flexDirection: "column",
  backgroundColor: "elevation.surface.raised",
  transition: "200ms",
  borderRadius: "border.radius.100",
  boxShadow: "elevation.shadow.raised",
  ":hover": {
    backgroundColor: "elevation.surface.hovered",
  },
});

const CardContainer = ({ text }) => {
  return (
    <div style={{ marginLeft: 2.5 }}>
   
        <div>
          <Button appearance="link">{text}</Button>
        </div>
    
    </div>
  );
};

const CreatedContainer = ({ status, text }) => {
  const appearance = {
    NEW: "new",
    IN_PROGRESS: "inprogress",
    READY: "success",
  };
  const text_ = {
    NEW: "Pending Creation",
    IN_PROGRESS: "In Progress",
    READY: text,
  };
  return (
    <div>
      <Lozenge appearance={appearance[status || "NEW"]}>
        {text_[status || "NEW"]}
      </Lozenge>
    </div>
  );
};

const ActionContainer = ({ sprintId, name, status }) => {
  const [loader, setLoader] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      {status != "IN_PROGRESS" && (
        <>
          <Drawer width="full" onClose={() => setOpen(false)} isOpen={open}>
            <ReportView name={name} sprintId={sprintId} />
          </Drawer>
          {loader && (
            <LoadingButton appearance="primary" isLoading>
              Generate
            </LoadingButton>
          )}
          {!loader && (
            <Button
              onClick={async () => {
                const status_ = status || "NEW";
                if (status_ == "NEW") {
                  setLoader(true);
                  await invoke("generateReport", { sprintId });
                  router.reload();
                } else {
                  setOpen(true);
                }
              }}
              appearance={status == "READY" ? "default" : "primary"}
              spacing="compact"
            >
              {status == "READY" && <>&nbsp;&nbsp;&nbsp;</>}
              {status == "READY" ? "View" : "Generate"}
              {status == "READY" && <>&nbsp;&nbsp;&nbsp;</>}
            </Button>
          )}
        </>
      )}
    </>
  );
};

function App() {
  const [loader, setLoader] = useState(false);
  const [sprints, setSprints] = useState([]);
  useState(() => {
    setLoader(true);
    view.getContext().then(async (context) => {
      const projectId = context.extension.project.id;
      const sprintsData = await invoke("getSprints", { projectId });
      const sprints_ = sprintsData.map((val, index) => ({
        key: `row-${index}`,
        cells: [
          {
            key: `name-${index}`,
            content: <CardContainer text={val.name} />,
          },
          {
            key: `date-${index}`,
            content: (
              <CreatedContainer status={val.status} text={val.createdOn} />
            ),
          },
          {
            key: `action-${index}`,
            content: (
              <ActionContainer
                name={val.name}
                sprintId={val.id}
                status={val.status}
              />
            ),
          },
        ],
      }));
      setSprints(sprints_);
      setLoader(false);
    });
  }, []);

  const cells = {
    cells: [
      {
        key: "name",
        content: "Sprint",
        width: 25,
      },
      {
        key: "created-on",
        content: "Created On",
        width: 50,
      },
      {
        key: "action",
        content: "Action",
        width: 25,
      },
    ],
  };

  return (
    <div >
      <div className="table-container">
        <DynamicTable
          rowsPerPage={5}
          defaultPage={1}
          isLoading={loader}
          rows={sprints}
          head={cells}
          isFixedSize
          caption={"Reports"}
        />
      </div>
    </div>
  );
}

export default App;
