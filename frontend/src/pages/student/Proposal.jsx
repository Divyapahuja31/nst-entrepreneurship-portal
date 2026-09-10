import { Typography } from "@mui/material";
import ProposalStepper from "../../components/ProposalStepper.jsx";

import Step1 from "../../components/Proposal_steps/Step1";
import Step2 from "../../components/Proposal_steps/Step2";
import Step3 from "../../components/Proposal_steps/Step3";
import Step4 from "../../components/Proposal_steps/Step4";
import Step5 from "../../components/Proposal_steps/Step5";


const steps = [
  {
    component: Step1,
  },
  {
    component: Step2,
  },
  {
    component: Step3,
  },
  {
    component: Step4,
  },
  {
    component: Step5,
  },
];

const initialData = {
  oneLiner: "",
  problem: "",
  targetCustomer: "",

  currentStage: "",
  currentTraction: "",
  businessModel: "",

  assumptions: "",
  risks: "",
  sixMonthGoals: "",

  coFounders: "",
  techStack: "",
  capitalStatus: "",
  weeklyHours: "",
  website: "",
  demoLink: "",
  deck: "",
};

export const Proposal = () => {

    const handleSubmit = (data) => {
    console.log("Submitting proposal:", data);
    alert("Proposal submitted successfully!");

    // API call later
  };
  return (
    <>
      <div
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          margin: "0 auto",
          borderRadius: "20px",
          maxWidth: "65%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h4">Proposal</Typography>
        <Typography variant="h6">
          Tell us where your startup is today
        </Typography>
      </div>
      <div style={{marginTop:"2%"}}>
    <ProposalStepper
      steps={steps}
      initialData={initialData}
      onSubmit={handleSubmit}
      />
    </div>
    </>
  );
};
