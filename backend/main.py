from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import yaml
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPEC_URL = "https://d1uauaxba7bl26.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json"
cfn_spec = {}

class ChatRequest(BaseModel):
    message: str

def load_spec():
    global cfn_spec
    if not cfn_spec:
        try:
            res = requests.get(SPEC_URL)
            res.raise_for_status()
            cfn_spec = res.json()
        except Exception as e:
            print("Failed to load CFN spec:", e)
            cfn_spec = {} # Fallback

def get_required_properties(resource_type: str):
    load_spec()
    props = {}
    if cfn_spec and "ResourceTypes" in cfn_spec:
        resource = cfn_spec["ResourceTypes"].get(resource_type, {})
        properties = resource.get("Properties", {})
        for prop_name, prop_details in properties.items():
            if prop_details.get("Required", False):
                # Put a placeholder
                props[prop_name] = f"[{prop_details.get('PrimitiveType', 'String')}]"
    return props

def guess_resource_type(text: str):
    text = text.lower()
    if "s3" in text or "bucket" in text:
        return "AWS::S3::Bucket"
    if "ec2" in text or "instance" in text:
        return "AWS::EC2::Instance"
    if "rds" in text or "database" in text:
        return "AWS::RDS::DBInstance"
    if "dynamodb" in text or "table" in text:
        return "AWS::DynamoDB::Table"
    if "lambda" in text or "function" in text:
        return "AWS::Lambda::Function"
    if "sns" in text or "topic" in text:
        return "AWS::SNS::Topic"
    if "sqs" in text or "queue" in text:
        return "AWS::SQS::Queue"
    if "api gateway" in text or "api" in text:
        return "AWS::ApiGateway::RestApi"
    return None

def update_yaml(resource_type: str):
    data = {"Resources": {}}
    if os.path.exists("architecture.yaml"):
        with open("architecture.yaml", "r") as f:
            data = yaml.safe_load(f) or {"Resources": {}}
    
    count = len(data.get("Resources", {})) + 1
    resource_name = f"{resource_type.split('::')[-1]}{count}"
    
    if "Resources" not in data:
        data["Resources"] = {}
        
    data["Resources"][resource_name] = {
        "Type": resource_type,
        "Properties": get_required_properties(resource_type)
    }
    
    with open("architecture.yaml", "w") as f:
        yaml.dump(data, f)
        
    return data

@app.post("/api/chat")
def chat(req: ChatRequest):
    resource_type = guess_resource_type(req.message)
    if resource_type:
        yaml_data = update_yaml(resource_type)
        cfn_json = json.dumps(yaml_data, indent=2)
        return {
            "reply": f"Added {resource_type} to your architecture.",
            "json_output": cfn_json
        }
    elif req.message.lower() in ["clear", "reset"]:
        if os.path.exists("architecture.yaml"):
            os.remove("architecture.yaml")
        return {
            "reply": "Cleared architecture.",
            "json_output": "{}"
        }
    else:
        # Just return current spec if exists
        data = {}
        if os.path.exists("architecture.yaml"):
            with open("architecture.yaml", "r") as f:
                data = yaml.safe_load(f) or {}
                
        return {
            "reply": "I couldn't identify an AWS component. Try mentioning S3, EC2, RDS, DynamoDB, Lambda, SNS, SQS, or API Gateway.",
            "json_output": json.dumps(data, indent=2) if data else "{}"
        }

@app.get("/api/architecture")
def get_architecture():
    if os.path.exists("architecture.yaml"):
        with open("architecture.yaml", "r") as f:
            data = yaml.safe_load(f) or {}
            return json.dumps(data, indent=2)
    return "{}"
