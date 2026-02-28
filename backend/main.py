from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yaml
import json
import os
import spacy

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPEC_FILE = "CloudFormationResourceSpecification.json"
cfn_spec = {}
nlp = None

# Simple session state is no longer needed as we'll pass state from frontend
class ChatRequest(BaseModel):
    message: str
    current_proposal: list[str] = []

def load_all():
    global cfn_spec, nlp
    if not cfn_spec:
        try:
            with open(SPEC_FILE, 'r', encoding='utf-8') as f:
                cfn_spec = json.load(f)
        except Exception as e:
            print(f"Failed to load spec: {e}")
            cfn_spec = {"ResourceTypes": {}}
    
    if nlp is None:
        try:
            nlp = spacy.load("en_core_web_md")
        except Exception as e:
            print(f"Failed to load spaCy model: {e}")

def get_required_properties(resource_type: str):
    load_all()
    props = {}
    resource = cfn_spec.get("ResourceTypes", {}).get(resource_type, {})
    properties = resource.get("Properties", {})
    for prop_name, prop_details in properties.items():
        if prop_details.get("Required", False):
            props[prop_name] = f"[{prop_details.get('PrimitiveType', 'String')}]"
    return props

def think_and_design(text: str):
    load_all()
    text_doc = nlp(text.lower())
    
    # Common mappings to help similarity
    common_terms = {
        "AWS::S3::Bucket": "static website hosting content storage bucket files",
        "AWS::EC2::Instance": "virtual machine server computer instance web server",
        "AWS::RDS::DBInstance": "database relational sql mysql postgres aurora",
        "AWS::DynamoDB::Table": "nosql database table key-value document store",
        "AWS::Lambda::Function": "serverless function run code script backend",
        "AWS::SNS::Topic": "pubsub notification email alert messaging",
        "AWS::SQS::Queue": "message queue asynchronous decouple worker",
        "AWS::ApiGateway::RestApi": "rest api endpoint gateway interface",
        "AWS::CloudFront::Distribution": "cdn content delivery global edge cache",
        "AWS::ECS::Cluster": "containers docker fargate cluster orchestrator"
    }
    
    matches = []
    for res_type, terms in common_terms.items():
        terms_doc = nlp(terms)
        similarity = text_doc.similarity(terms_doc)
        # Check for direct keyword overlap as well for reliability
        direct_match = any(word.text in text.lower() for word in nlp(terms))
        
        if similarity > 0.6 or direct_match:
            matches.append(res_type)
    
    return list(set(matches))

def commit_architecture(resource_types):
    data = {"Resources": {}}
    if os.path.exists("architecture.yaml"):
        with open("architecture.yaml", "r") as f:
            data = yaml.safe_load(f) or {"Resources": {}}
    
    for r_type in resource_types:
        count = len(data.get("Resources", {})) + 1
        resource_name = f"{r_type.split('::')[-1]}{count}"
        if "Resources" not in data: data["Resources"] = {}
        data["Resources"][resource_name] = {
            "Type": r_type,
            "Properties": get_required_properties(r_type)
        }
        
    with open("architecture.yaml", "w") as f:
        yaml.dump(data, f)
    return data

@app.post("/api/chat")
def chat(req: ChatRequest):
    msg = req.message.strip().lower()
    proposal = req.current_proposal or []

    # Handle Confirmation
    if msg in ["yes", "yep", "sure", "proceed"]:
        if proposal:
            arch_data = commit_architecture(proposal)
            return {
                "reply": f"Great! I've added those {len(proposal)} components to your architecture.",
                "json_output": json.dumps(arch_data, indent=2),
                "is_proposal": False,
                "proposal": []
            }
        else:
            return {"reply": "I don't have a pending design to commit. What would you like to build?", "json_output": "{}", "is_proposal": False, "proposal": []}

    # Handle Rejection / Clarification
    if msg in ["no", "nope", "wait", "change"]:
        if proposal:
            res_type = proposal[0]
            props = get_required_properties(res_type)
            prop_names = list(props.keys())
            
            names = [s.split("::")[-1] for s in proposal]
            current_list = "\n".join([f"* {n}" for n in names])
            
            prefix = f"I've kept your current design:\n\n{current_list}\n\n"
            if prop_names:
                question = f"{prefix}To refine the {res_type.split('::')[-1]}, could you tell me more about the {prop_names[0]}? Or is there another component you'd prefer?"
            else:
                question = f"{prefix}Understood. What should I change or add instead?"
            return {"reply": question, "json_output": "{}", "is_proposal": False, "proposal": proposal}
        
    # Handle New Design Request
    if msg in ["clear", "reset"]:
        if os.path.exists("architecture.yaml"): os.remove("architecture.yaml")
        return {"reply": "Architecture cleared.", "json_output": "{}", "is_proposal": False, "proposal": []}

    # "Think" step - Merge if we already have a proposal
    suggested = think_and_design(req.message)
    new_proposal = list(set(proposal + suggested)) if suggested else proposal

    if new_proposal:
        names = [s.split("::")[-1] for s in new_proposal]
        reply = "I've updated the suggested design! Here are the components currently in your pattern:\n\n"
        reply += "\n".join([f"* {n}" for n in names])
        reply += "\n\nShould I proceed with adding these to your architecture?"
        return {
            "reply": reply,
            "json_output": "{}", 
            "is_proposal": True,
            "proposal": new_proposal
        }
    else:
        return {
            "reply": "I'm not sure which AWS components best fit that request. Could you describe your architectural needs in more detail?",
            "json_output": "{}",
            "is_proposal": False,
            "proposal": []
        }

@app.get("/api/architecture")
def get_architecture():
    if os.path.exists("architecture.yaml"):
        with open("architecture.yaml", "r") as f:
            data = yaml.safe_load(f) or {}
            return json.dumps(data, indent=2)
    return "{}"
