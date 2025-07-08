import { useEffect, useRef, useState, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  LiveServerToolCall,
  Modality,
} from "@google/genai";



function AltairComponent() {
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    setModel("models/gemini-2.0-flash-exp");
    setConfig({
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are my helpful assistant. Give accurate and crisp answers based on this data 
           Data : --->  {
           
           "policy_id": "POLICY-2025-001"
           "policy_holder": {
    "first_name": "Jane",
    "last_name": "Doe",
    "date_of_birth": "1985-07-12",
    "gender": "Female",
    "address": {
      "street": "123 Maple Street",
      "city": "Springfield",
      "state": "Illinois",
      "zip": "62704"
    },
    "phone": "+1-555-123-4567",
    "email": "jane.doe@example.com"
  },
  "policy_details": {
    "type": "Homeowners Insurance",
    "effective_date": "2025-01-01",
    "expiration_date": "2026-01-01",
    "status": "Active",
    "premium": {
      "amount": 1450.75,
      "currency": "USD",
      "payment_frequency": "Annual",
      "last_payment_date": "2025-01-01",
      "next_payment_due": "2026-01-01"
    },
    "coverage": {
      "dwelling": 250000,
      "other_structures": 20000,
      "personal_property": 75000,
      "loss_of_use": 30000,
      "personal_liability": 100000,
      "medical_payments": 5000
    },
    "deductible": {
      "amount": 1000,
      "currency": "USD"
    }
  },
  "endorsements": [
    {
      "name": "Water Backup Coverage",
      "coverage_limit": 10000,
      "premium": 75.50
    },
    {
      "name": "Equipment Breakdown",
      "coverage_limit": 50000,
      "premium": 50.00
    }
  ],
  "mortgagee": {
    "name": "ABC Bank",
    "loan_number": "LOAN-123456789",
    "address": {
      "street": "987 Finance Ave",
      "city": "Chicago",
      "state": "Illinois",
      "zip": "60601"
    }
  },
  "claims_history": [
    {
      "claim_id": "CLM-2023-001",
      "date_of_loss": "2023-06-15",
      "loss_type": "Wind Damage",
      "amount_paid": 5200,
      "status": "Closed"
    },
    {
      "claim_id": "CLM-2022-004",
      "date_of_loss": "2022-09-30",
      "loss_type": "Water Damage",
      "amount_paid": 8000,
      "status": "Closed"
    }
  ],
  "agent": {
    "name": "John Smith",
    "phone": "+1-555-987-6543",
    "email": "john.smith@insuranceco.com"
  },
  "notes": [
    "Policy renewed automatically on 2025-01-01.",
    "Policy holder requested higher dwelling coverage for next term.",
    "No open claims as of last review."
  ],
  "policy_flags": {
    "under_review": false,
    "requires_followup": false,
    "eligible_for_discount": true
  }
}

            `,
          },
        ],
      },
      
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }
      
      
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls?.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
                name: fc.name,
              })),
            }),
          200
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
