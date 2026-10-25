
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "angles": {
                  Row: {
                    "candidate": NonNullable<Json>,"created_at": string,"gates": NonNullable<Json>,"generation_id": string,"id": string,"is_finalist": boolean,"is_winner": boolean,"kept_as_loser": boolean,"rank": number | null,"scores": NonNullable<Json>,"thesis": string | null,"total": number | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate": NonNullable<Json>,"created_at"?: string,"gates"?: NonNullable<Json>,"generation_id": string,"id"?: string,"is_finalist"?: boolean,"is_winner"?: boolean,"kept_as_loser"?: boolean,"rank"?: number | null,"scores"?: NonNullable<Json>,"thesis"?: string | null,"total"?: number | null,"workspace_id": string
                  }
                  Update: {
                    "candidate"?: NonNullable<Json>,"created_at"?: string,"gates"?: NonNullable<Json>,"generation_id"?: string,"id"?: string,"is_finalist"?: boolean,"is_winner"?: boolean,"kept_as_loser"?: boolean,"rank"?: number | null,"scores"?: NonNullable<Json>,"thesis"?: string | null,"total"?: number | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "angles_generation_id_fkey"
      columns: ["generation_id"]
isOneToOne: false
      referencedRelation: "generations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "angles_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"app_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"meta": NonNullable<Json>,"target_id": string | null,"target_type": string | null,"workspace_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"meta"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null,"workspace_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"meta"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null,"workspace_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"campaigns": {
                  Row: {
                    "argument": Json | null,"asset_plan": NonNullable<Json>,"created_at": string,"created_by": string | null,"id": string,"name": string,"offer_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "argument"?: Json | null,"asset_plan"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"offer_id": string,"workspace_id": string
                  }
                  Update: {
                    "argument"?: Json | null,"asset_plan"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"offer_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaigns_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"controls": {
                  Row: {
                    "author": string | null,"created_at": string,"embedding": string | null,"excerpt": string | null,"external_id": string | null,"format": string,"full_text": string | null,"funnel_position": string | null,"id": string,"lessons": NonNullable<Json>,"losing_variants": NonNullable<Json>,"market": string | null,"notes": string | null,"results": NonNullable<Json>,"rights_status": string,"source_url": string | null,"structure": NonNullable<Json>,"title": string,"traffic": string | null,"verification": string | null,"workspace_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string | null,"created_at"?: string,"embedding"?: string | null,"excerpt"?: string | null,"external_id"?: string | null,"format": string,"full_text"?: string | null,"funnel_position"?: string | null,"id"?: string,"lessons"?: NonNullable<Json>,"losing_variants"?: NonNullable<Json>,"market"?: string | null,"notes"?: string | null,"results"?: NonNullable<Json>,"rights_status"?: string,"source_url"?: string | null,"structure"?: NonNullable<Json>,"title": string,"traffic"?: string | null,"verification"?: string | null,"workspace_id"?: string | null
                  }
                  Update: {
                    "author"?: string | null,"created_at"?: string,"embedding"?: string | null,"excerpt"?: string | null,"external_id"?: string | null,"format"?: string,"full_text"?: string | null,"funnel_position"?: string | null,"id"?: string,"lessons"?: NonNullable<Json>,"losing_variants"?: NonNullable<Json>,"market"?: string | null,"notes"?: string | null,"results"?: NonNullable<Json>,"rights_status"?: string,"source_url"?: string | null,"structure"?: NonNullable<Json>,"title"?: string,"traffic"?: string | null,"verification"?: string | null,"workspace_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "controls_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"critiques": {
                  Row: {
                    "ai_failure_map": NonNullable<Json>,"brief": string | null,"chief": string | null,"confidence": string | null,"created_at": string,"defect": string | null,"defect_named": string | null,"embedding": string | null,"evidence": string | null,"external_id": string | null,"format": string | null,"id": string,"principle": string | null,"quote_status": string | null,"reason": string | null,"source": string | null,"source_url": string | null,"status": string,"strong_revision": string | null,"tags": NonNullable<Json>,"tested": Json | null,"weak_draft": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_failure_map"?: NonNullable<Json>,"brief"?: string | null,"chief"?: string | null,"confidence"?: string | null,"created_at"?: string,"defect"?: string | null,"defect_named"?: string | null,"embedding"?: string | null,"evidence"?: string | null,"external_id"?: string | null,"format"?: string | null,"id"?: string,"principle"?: string | null,"quote_status"?: string | null,"reason"?: string | null,"source"?: string | null,"source_url"?: string | null,"status"?: string,"strong_revision"?: string | null,"tags"?: NonNullable<Json>,"tested"?: Json | null,"weak_draft"?: string | null
                  }
                  Update: {
                    "ai_failure_map"?: NonNullable<Json>,"brief"?: string | null,"chief"?: string | null,"confidence"?: string | null,"created_at"?: string,"defect"?: string | null,"defect_named"?: string | null,"embedding"?: string | null,"evidence"?: string | null,"external_id"?: string | null,"format"?: string | null,"id"?: string,"principle"?: string | null,"quote_status"?: string | null,"reason"?: string | null,"source"?: string | null,"source_url"?: string | null,"status"?: string,"strong_revision"?: string | null,"tags"?: NonNullable<Json>,"tested"?: Json | null,"weak_draft"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"draft_feedback": {
                  Row: {
                    "created_at": string,"draft_id": string,"id": string,"rating": number | null,"reason": string | null,"user_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"draft_id": string,"id"?: string,"rating"?: number | null,"reason"?: string | null,"user_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"draft_id"?: string,"id"?: string,"rating"?: number | null,"reason"?: string | null,"user_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "draft_feedback_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draft_feedback_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"draft_flags": {
                  Row: {
                    "claim_id": string | null,"created_at": string,"decided_at": string | null,"decided_by": string | null,"decision": string,"draft_id": string,"generation_id": string,"id": string,"issue": string | null,"kind": string,"quote": string | null,"rule": string | null,"severity": string,"source": string,"suggested_rewrite": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_id"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision"?: string,"draft_id": string,"generation_id": string,"id"?: string,"issue"?: string | null,"kind": string,"quote"?: string | null,"rule"?: string | null,"severity"?: string,"source": string,"suggested_rewrite"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "claim_id"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision"?: string,"draft_id"?: string,"generation_id"?: string,"id"?: string,"issue"?: string | null,"kind"?: string,"quote"?: string | null,"rule"?: string | null,"severity"?: string,"source"?: string,"suggested_rewrite"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "draft_flags_claim_id_fkey"
      columns: ["claim_id"]
isOneToOne: false
      referencedRelation: "offer_claims"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draft_flags_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draft_flags_generation_id_fkey"
      columns: ["generation_id"]
isOneToOne: false
      referencedRelation: "generations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "draft_flags_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"drafts": {
                  Row: {
                    "blocks": NonNullable<Json>,"created_at": string,"created_by": string | null,"generation_id": string,"id": string,"label": string | null,"ledger_refs": NonNullable<Json>,"markdown": string,"origin": string,"skim_path": Json | null,"version": number,"word_count": number | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocks"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"generation_id": string,"id"?: string,"label"?: string | null,"ledger_refs"?: NonNullable<Json>,"markdown"?: string,"origin": string,"skim_path"?: Json | null,"version": number,"word_count"?: number | null,"workspace_id": string
                  }
                  Update: {
                    "blocks"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"generation_id"?: string,"id"?: string,"label"?: string | null,"ledger_refs"?: NonNullable<Json>,"markdown"?: string,"origin"?: string,"skim_path"?: Json | null,"version"?: number,"word_count"?: number | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "drafts_generation_id_fkey"
      columns: ["generation_id"]
isOneToOne: false
      referencedRelation: "generations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "drafts_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"eval_briefs": {
                  Row: {
                    "brief": NonNullable<Json>,"created_at": string,"external_id": string | null,"formats": NonNullable<Json>,"id": string,"market": string | null,"name": string,"notes": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brief": NonNullable<Json>,"created_at"?: string,"external_id"?: string | null,"formats"?: NonNullable<Json>,"id"?: string,"market"?: string | null,"name": string,"notes"?: string | null
                  }
                  Update: {
                    "brief"?: NonNullable<Json>,"created_at"?: string,"external_id"?: string | null,"formats"?: NonNullable<Json>,"id"?: string,"market"?: string | null,"name"?: string,"notes"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"eval_comparisons": {
                  Row: {
                    "brief_id": string | null,"correct": boolean | null,"created_at": string,"ground_truth": string | null,"id": string,"judge_model": string | null,"judge_prompt_version_id": string | null,"judge_user": string | null,"judged_by": string,"kind": string,"output_a": string | null,"output_b": string | null,"reason": string | null,"split_test_pair_id": string | null,"winner": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brief_id"?: string | null,"correct"?: never,"created_at"?: string,"ground_truth"?: string | null,"id"?: string,"judge_model"?: string | null,"judge_prompt_version_id"?: string | null,"judge_user"?: string | null,"judged_by": string,"kind": string,"output_a"?: string | null,"output_b"?: string | null,"reason"?: string | null,"split_test_pair_id"?: string | null,"winner": string
                  }
                  Update: {
                    "brief_id"?: string | null,"correct"?: never,"created_at"?: string,"ground_truth"?: string | null,"id"?: string,"judge_model"?: string | null,"judge_prompt_version_id"?: string | null,"judge_user"?: string | null,"judged_by"?: string,"kind"?: string,"output_a"?: string | null,"output_b"?: string | null,"reason"?: string | null,"split_test_pair_id"?: string | null,"winner"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "eval_comparisons_brief_id_fkey"
      columns: ["brief_id"]
isOneToOne: false
      referencedRelation: "eval_briefs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eval_comparisons_judge_prompt_version_id_fkey"
      columns: ["judge_prompt_version_id"]
isOneToOne: false
      referencedRelation: "prompt_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eval_comparisons_output_a_fkey"
      columns: ["output_a"]
isOneToOne: false
      referencedRelation: "eval_outputs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eval_comparisons_output_b_fkey"
      columns: ["output_b"]
isOneToOne: false
      referencedRelation: "eval_outputs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eval_comparisons_split_test_pair_id_fkey"
      columns: ["split_test_pair_id"]
isOneToOne: false
      referencedRelation: "split_test_pairs"
      referencedColumns: ["id"]
    }
                  ]
                },"eval_outputs": {
                  Row: {
                    "brief_id": string,"cost_usd": number,"created_at": string,"format": string,"id": string,"markdown": string | null,"output": Json | null,"run_id": string,"steps": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brief_id": string,"cost_usd"?: number,"created_at"?: string,"format": string,"id"?: string,"markdown"?: string | null,"output"?: Json | null,"run_id": string,"steps"?: Json | null
                  }
                  Update: {
                    "brief_id"?: string,"cost_usd"?: number,"created_at"?: string,"format"?: string,"id"?: string,"markdown"?: string | null,"output"?: Json | null,"run_id"?: string,"steps"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "eval_outputs_brief_id_fkey"
      columns: ["brief_id"]
isOneToOne: false
      referencedRelation: "eval_briefs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eval_outputs_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "eval_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"eval_runs": {
                  Row: {
                    "baseline": boolean,"cost_usd": number,"created_at": string,"created_by": string | null,"finished_at": string | null,"id": string,"model_set": NonNullable<Json>,"name": string,"prompt_version_set": NonNullable<Json>,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "baseline"?: boolean,"cost_usd"?: number,"created_at"?: string,"created_by"?: string | null,"finished_at"?: string | null,"id"?: string,"model_set"?: NonNullable<Json>,"name": string,"prompt_version_set"?: NonNullable<Json>,"status"?: string
                  }
                  Update: {
                    "baseline"?: boolean,"cost_usd"?: number,"created_at"?: string,"created_by"?: string | null,"finished_at"?: string | null,"id"?: string,"model_set"?: NonNullable<Json>,"name"?: string,"prompt_version_set"?: NonNullable<Json>,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"example_sections": {
                  Row: {
                    "annotation": string,"created_at": string,"embedding": string | null,"example_id": string,"excerpt": string | null,"id": string,"section_type": string,"text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "annotation": string,"created_at"?: string,"embedding"?: string | null,"example_id": string,"excerpt"?: string | null,"id"?: string,"section_type": string,"text"?: string | null
                  }
                  Update: {
                    "annotation"?: string,"created_at"?: string,"embedding"?: string | null,"example_id"?: string,"excerpt"?: string | null,"id"?: string,"section_type"?: string,"text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "example_sections_example_id_fkey"
      columns: ["example_id"]
isOneToOne: false
      referencedRelation: "examples"
      referencedColumns: ["id"]
    }
                  ]
                },"examples": {
                  Row: {
                    "annotations": NonNullable<Json>,"argument_sentence": string | null,"author": string | null,"awareness": string | null,"created_at": string,"created_by": string | null,"documented_result": string | null,"embedding": string | null,"excerpt": string | null,"format": string,"full_text": string | null,"funnel_position": string | null,"hook": string | null,"id": string,"is_loser": boolean,"lead_type": string | null,"lessons": NonNullable<Json>,"market": string | null,"mechanism_type": string | null,"offer_devices": NonNullable<Json>,"proof_placement": NonNullable<Json>,"rights_status": string,"selling_situation": string | null,"sophistication": string | null,"source_url": string | null,"status": string,"title": string,"updated_at": string,"voice_profile": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "annotations"?: NonNullable<Json>,"argument_sentence"?: string | null,"author"?: string | null,"awareness"?: string | null,"created_at"?: string,"created_by"?: string | null,"documented_result"?: string | null,"embedding"?: string | null,"excerpt"?: string | null,"format": string,"full_text"?: string | null,"funnel_position"?: string | null,"hook"?: string | null,"id"?: string,"is_loser"?: boolean,"lead_type"?: string | null,"lessons"?: NonNullable<Json>,"market"?: string | null,"mechanism_type"?: string | null,"offer_devices"?: NonNullable<Json>,"proof_placement"?: NonNullable<Json>,"rights_status"?: string,"selling_situation"?: string | null,"sophistication"?: string | null,"source_url"?: string | null,"status"?: string,"title": string,"updated_at"?: string,"voice_profile"?: string | null
                  }
                  Update: {
                    "annotations"?: NonNullable<Json>,"argument_sentence"?: string | null,"author"?: string | null,"awareness"?: string | null,"created_at"?: string,"created_by"?: string | null,"documented_result"?: string | null,"embedding"?: string | null,"excerpt"?: string | null,"format"?: string,"full_text"?: string | null,"funnel_position"?: string | null,"hook"?: string | null,"id"?: string,"is_loser"?: boolean,"lead_type"?: string | null,"lessons"?: NonNullable<Json>,"market"?: string | null,"mechanism_type"?: string | null,"offer_devices"?: NonNullable<Json>,"proof_placement"?: NonNullable<Json>,"rights_status"?: string,"selling_situation"?: string | null,"sophistication"?: string | null,"source_url"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"voice_profile"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"generation_predictions": {
                  Row: {
                    "control_ref": string | null,"created_at": string,"draft_id": string | null,"generation_id": string,"id": string,"prediction": string,"reason": string | null,"refund_rate": number | null,"reported_at": string | null,"reported_result": Json | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "control_ref"?: string | null,"created_at"?: string,"draft_id"?: string | null,"generation_id": string,"id"?: string,"prediction": string,"reason"?: string | null,"refund_rate"?: number | null,"reported_at"?: string | null,"reported_result"?: Json | null,"workspace_id": string
                  }
                  Update: {
                    "control_ref"?: string | null,"created_at"?: string,"draft_id"?: string | null,"generation_id"?: string,"id"?: string,"prediction"?: string,"reason"?: string | null,"refund_rate"?: number | null,"reported_at"?: string | null,"reported_result"?: Json | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "generation_predictions_draft_id_fkey"
      columns: ["draft_id"]
isOneToOne: false
      referencedRelation: "drafts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generation_predictions_generation_id_fkey"
      columns: ["generation_id"]
isOneToOne: false
      referencedRelation: "generations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generation_predictions_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"generation_steps": {
                  Row: {
                    "attempt": number,"cost_usd": number,"created_at": string,"duration_ms": number | null,"error": string | null,"finished_at": string | null,"generation_id": string,"id": string,"input_hash": string | null,"input_tokens": number,"model": string | null,"output": Json | null,"output_tokens": number,"started_at": string | null,"status": string,"step": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt"?: number,"cost_usd"?: number,"created_at"?: string,"duration_ms"?: number | null,"error"?: string | null,"finished_at"?: string | null,"generation_id": string,"id"?: string,"input_hash"?: string | null,"input_tokens"?: number,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number,"started_at"?: string | null,"status"?: string,"step": string,"workspace_id": string
                  }
                  Update: {
                    "attempt"?: number,"cost_usd"?: number,"created_at"?: string,"duration_ms"?: number | null,"error"?: string | null,"finished_at"?: string | null,"generation_id"?: string,"id"?: string,"input_hash"?: string | null,"input_tokens"?: number,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number,"started_at"?: string | null,"status"?: string,"step"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "generation_steps_generation_id_fkey"
      columns: ["generation_id"]
isOneToOne: false
      referencedRelation: "generations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generation_steps_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"generations": {
                  Row: {
                    "campaign_id": string | null,"completed_at": string | null,"cost_usd": number,"created_at": string,"created_by": string | null,"current_step": string | null,"error": string | null,"format": string,"id": string,"input_tokens": number,"model_set": NonNullable<Json>,"offer_id": string,"options": NonNullable<Json>,"output_tokens": number,"progress_message": string | null,"prompt_version_set": NonNullable<Json>,"purpose": string | null,"research_id": string | null,"selected_angle_id": string | null,"status": string,"step_order": NonNullable<Json>,"updated_at": string,"variant_id": string | null,"voice_profile_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id"?: string | null,"completed_at"?: string | null,"cost_usd"?: number,"created_at"?: string,"created_by"?: string | null,"current_step"?: string | null,"error"?: string | null,"format": string,"id"?: string,"input_tokens"?: number,"model_set"?: NonNullable<Json>,"offer_id": string,"options"?: NonNullable<Json>,"output_tokens"?: number,"progress_message"?: string | null,"prompt_version_set"?: NonNullable<Json>,"purpose"?: string | null,"research_id"?: string | null,"selected_angle_id"?: string | null,"status"?: string,"step_order"?: NonNullable<Json>,"updated_at"?: string,"variant_id"?: string | null,"voice_profile_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "campaign_id"?: string | null,"completed_at"?: string | null,"cost_usd"?: number,"created_at"?: string,"created_by"?: string | null,"current_step"?: string | null,"error"?: string | null,"format"?: string,"id"?: string,"input_tokens"?: number,"model_set"?: NonNullable<Json>,"offer_id"?: string,"options"?: NonNullable<Json>,"output_tokens"?: number,"progress_message"?: string | null,"prompt_version_set"?: NonNullable<Json>,"purpose"?: string | null,"research_id"?: string | null,"selected_angle_id"?: string | null,"status"?: string,"step_order"?: NonNullable<Json>,"updated_at"?: string,"variant_id"?: string | null,"voice_profile_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "generations_campaign_fk"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_research_id_fkey"
      columns: ["research_id"]
isOneToOne: false
      referencedRelation: "offer_research"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_selected_angle_fk"
      columns: ["selected_angle_id"]
isOneToOne: false
      referencedRelation: "angles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "offer_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_voice_profile_id_fkey"
      columns: ["voice_profile_id"]
isOneToOne: false
      referencedRelation: "voice_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"judge_calibrations": {
                  Row: {
                    "accuracy": number | null,"correct": number,"created_at": string,"details": NonNullable<Json>,"id": string,"judge_model": string,"judge_prompt_version_id": string | null,"pairs_evaluated": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy"?: never,"correct": number,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"judge_model": string,"judge_prompt_version_id"?: string | null,"pairs_evaluated": number
                  }
                  Update: {
                    "accuracy"?: never,"correct"?: number,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"judge_model"?: string,"judge_prompt_version_id"?: string | null,"pairs_evaluated"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "judge_calibrations_judge_prompt_version_id_fkey"
      columns: ["judge_prompt_version_id"]
isOneToOne: false
      referencedRelation: "prompt_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"llm_calls": {
                  Row: {
                    "attempt": number | null,"cache_read_tokens": number,"cache_write_tokens": number,"cost_usd": number,"created_at": string,"error": string | null,"eval_output_id": string | null,"generation_id": string | null,"id": number,"input_tokens": number,"latency_ms": number | null,"model": string,"output_tokens": number,"prompt_version_id": string | null,"purpose": string | null,"request_id": string | null,"step": string | null,"stop_reason": string | null,"web_searches": number,"workspace_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt"?: number | null,"cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd"?: number,"created_at"?: string,"error"?: string | null,"eval_output_id"?: string | null,"generation_id"?: string | null,"id"?: never,"input_tokens"?: number,"latency_ms"?: number | null,"model": string,"output_tokens"?: number,"prompt_version_id"?: string | null,"purpose"?: string | null,"request_id"?: string | null,"step"?: string | null,"stop_reason"?: string | null,"web_searches"?: number,"workspace_id"?: string | null
                  }
                  Update: {
                    "attempt"?: number | null,"cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd"?: number,"created_at"?: string,"error"?: string | null,"eval_output_id"?: string | null,"generation_id"?: string | null,"id"?: never,"input_tokens"?: number,"latency_ms"?: number | null,"model"?: string,"output_tokens"?: number,"prompt_version_id"?: string | null,"purpose"?: string | null,"request_id"?: string | null,"step"?: string | null,"stop_reason"?: string | null,"web_searches"?: number,"workspace_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "llm_calls_prompt_version_id_fkey"
      columns: ["prompt_version_id"]
isOneToOne: false
      referencedRelation: "prompt_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_claims": {
                  Row: {
                    "claim_text": string,"claim_type": string,"created_at": string,"created_by": string,"deadline": Json | null,"earnings_context": Json | null,"establishment_signal": boolean,"evidence": NonNullable<Json>,"evidence_grade": string | null,"flag": Json | null,"former_price": Json | null,"guarantee_terms": Json | null,"id": string,"material_connection": boolean,"offer_id": string,"precision": string | null,"role": string | null,"scarcity": Json | null,"status": string,"story_claim": boolean,"trial_terms": Json | null,"typical_result": string | null,"updated_at": string,"user_decision": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_text": string,"claim_type"?: string,"created_at"?: string,"created_by"?: string,"deadline"?: Json | null,"earnings_context"?: Json | null,"establishment_signal"?: boolean,"evidence"?: NonNullable<Json>,"evidence_grade"?: string | null,"flag"?: Json | null,"former_price"?: Json | null,"guarantee_terms"?: Json | null,"id"?: string,"material_connection"?: boolean,"offer_id": string,"precision"?: string | null,"role"?: string | null,"scarcity"?: Json | null,"status"?: string,"story_claim"?: boolean,"trial_terms"?: Json | null,"typical_result"?: string | null,"updated_at"?: string,"user_decision"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "claim_text"?: string,"claim_type"?: string,"created_at"?: string,"created_by"?: string,"deadline"?: Json | null,"earnings_context"?: Json | null,"establishment_signal"?: boolean,"evidence"?: NonNullable<Json>,"evidence_grade"?: string | null,"flag"?: Json | null,"former_price"?: Json | null,"guarantee_terms"?: Json | null,"id"?: string,"material_connection"?: boolean,"offer_id"?: string,"precision"?: string | null,"role"?: string | null,"scarcity"?: Json | null,"status"?: string,"story_claim"?: boolean,"trial_terms"?: Json | null,"typical_result"?: string | null,"updated_at"?: string,"user_decision"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_claims_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_claims_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_config": {
                  Row: {
                    "business_opportunity": boolean,"edge_tolerance": string | null,"first_week_experience": string | null,"greeting": string | null,"humor_policy": NonNullable<Json>,"notice_recipient": boolean,"offer_id": string,"refund_window_days": number | null,"updated_at": string,"vertical": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_opportunity"?: boolean,"edge_tolerance"?: string | null,"first_week_experience"?: string | null,"greeting"?: string | null,"humor_policy"?: NonNullable<Json>,"notice_recipient"?: boolean,"offer_id": string,"refund_window_days"?: number | null,"updated_at"?: string,"vertical"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "business_opportunity"?: boolean,"edge_tolerance"?: string | null,"first_week_experience"?: string | null,"greeting"?: string | null,"humor_policy"?: NonNullable<Json>,"notice_recipient"?: boolean,"offer_id"?: string,"refund_window_days"?: number | null,"updated_at"?: string,"vertical"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_config_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: true
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_config_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_questions": {
                  Row: {
                    "answer": string | null,"answered_at": string | null,"created_at": string,"id": string,"offer_id": string,"question": string,"why": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer"?: string | null,"answered_at"?: string | null,"created_at"?: string,"id"?: string,"offer_id": string,"question": string,"why"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "answer"?: string | null,"answered_at"?: string | null,"created_at"?: string,"id"?: string,"offer_id"?: string,"question"?: string,"why"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_questions_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_questions_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_research": {
                  Row: {
                    "active": boolean,"cost_usd": number,"created_at": string,"dossier": NonNullable<Json>,"id": string,"model": string | null,"offer_id": string,"sources": NonNullable<Json>,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"cost_usd"?: number,"created_at"?: string,"dossier"?: NonNullable<Json>,"id"?: string,"model"?: string | null,"offer_id": string,"sources"?: NonNullable<Json>,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "active"?: boolean,"cost_usd"?: number,"created_at"?: string,"dossier"?: NonNullable<Json>,"id"?: string,"model"?: string | null,"offer_id"?: string,"sources"?: NonNullable<Json>,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_research_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_research_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_sources": {
                  Row: {
                    "created_at": string,"error": string | null,"extracted_text": string | null,"extraction_status": string,"id": string,"kind": string,"mime_type": string | null,"offer_id": string,"storage_path": string | null,"title": string | null,"url": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"extracted_text"?: string | null,"extraction_status"?: string,"id"?: string,"kind": string,"mime_type"?: string | null,"offer_id": string,"storage_path"?: string | null,"title"?: string | null,"url"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"extracted_text"?: string | null,"extraction_status"?: string,"id"?: string,"kind"?: string,"mime_type"?: string | null,"offer_id"?: string,"storage_path"?: string | null,"title"?: string | null,"url"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_sources_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_sources_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_variants": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"chosen": Json | null,"created_at": string,"deadline": Json | null,"gap_note": string | null,"guarantee": Json | null,"id": string,"offer_id": string,"options_sheet": NonNullable<Json>,"reasons": string | null,"status": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"chosen"?: Json | null,"created_at"?: string,"deadline"?: Json | null,"gap_note"?: string | null,"guarantee"?: Json | null,"id"?: string,"offer_id": string,"options_sheet"?: NonNullable<Json>,"reasons"?: string | null,"status"?: string,"workspace_id": string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"chosen"?: Json | null,"created_at"?: string,"deadline"?: Json | null,"gap_note"?: string | null,"guarantee"?: Json | null,"id"?: string,"offer_id"?: string,"options_sheet"?: NonNullable<Json>,"reasons"?: string | null,"status"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_variants_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_variants_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "audience": string | null,"brief": NonNullable<Json>,"created_at": string,"created_by": string | null,"guarantee": string | null,"id": string,"name": string,"positioning": string | null,"price": string | null,"status": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string | null,"brief"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"guarantee"?: string | null,"id"?: string,"name": string,"positioning"?: string | null,"price"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "audience"?: string | null,"brief"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"guarantee"?: string | null,"id"?: string,"name"?: string,"positioning"?: string | null,"price"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"onboarding_state": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"onboarding_state"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"onboarding_state"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"prompt_versions": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"effort": string,"id": string,"max_tokens": number,"model": string,"notes": string | null,"step": string,"template": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"effort"?: string,"id"?: string,"max_tokens"?: number,"model"?: string,"notes"?: string | null,"step": string,"template": string,"version": number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"effort"?: string,"id"?: string,"max_tokens"?: number,"model"?: string,"notes"?: string | null,"step"?: string,"template"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"split_test_pairs": {
                  Row: {
                    "confidence": string | null,"contradicts_standard": boolean,"created_at": string,"element_tested": string | null,"external_id": string | null,"format": string | null,"holdout": boolean,"id": string,"lift": string | null,"metric": string | null,"principle": string | null,"sample_size": string | null,"source": string | null,"source_url": string | null,"variant_a": string | null,"variant_b": string | null,"verification": string | null,"why_it_won": string | null,"winner": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "confidence"?: string | null,"contradicts_standard"?: boolean,"created_at"?: string,"element_tested"?: string | null,"external_id"?: string | null,"format"?: string | null,"holdout"?: boolean,"id"?: string,"lift"?: string | null,"metric"?: string | null,"principle"?: string | null,"sample_size"?: string | null,"source"?: string | null,"source_url"?: string | null,"variant_a"?: string | null,"variant_b"?: string | null,"verification"?: string | null,"why_it_won"?: string | null,"winner"?: string | null
                  }
                  Update: {
                    "confidence"?: string | null,"contradicts_standard"?: boolean,"created_at"?: string,"element_tested"?: string | null,"external_id"?: string | null,"format"?: string | null,"holdout"?: boolean,"id"?: string,"lift"?: string | null,"metric"?: string | null,"principle"?: string | null,"sample_size"?: string | null,"source"?: string | null,"source_url"?: string | null,"variant_a"?: string | null,"variant_b"?: string | null,"verification"?: string | null,"why_it_won"?: string | null,"winner"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"usage_events": {
                  Row: {
                    "attempt": number | null,"cost_usd": number,"created_at": string,"generation_id": string | null,"id": number,"kind": string,"step": string | null,"tokens": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt"?: number | null,"cost_usd"?: number,"created_at"?: string,"generation_id"?: string | null,"id"?: never,"kind": string,"step"?: string | null,"tokens"?: number,"workspace_id": string
                  }
                  Update: {
                    "attempt"?: number | null,"cost_usd"?: number,"created_at"?: string,"generation_id"?: string | null,"id"?: never,"kind"?: string,"step"?: string | null,"tokens"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"voice_profiles": {
                  Row: {
                    "created_at": string,"dead_words": NonNullable<Json>,"exemplar_paragraphs": NonNullable<Json>,"greeting": string | null,"id": string,"idiom_bank": NonNullable<Json>,"name": string,"offer_id": string | null,"parameters": NonNullable<Json>,"readability_band": string | null,"samples": NonNullable<Json>,"story_inventory": NonNullable<Json>,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dead_words"?: NonNullable<Json>,"exemplar_paragraphs"?: NonNullable<Json>,"greeting"?: string | null,"id"?: string,"idiom_bank"?: NonNullable<Json>,"name": string,"offer_id"?: string | null,"parameters"?: NonNullable<Json>,"readability_band"?: string | null,"samples"?: NonNullable<Json>,"story_inventory"?: NonNullable<Json>,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"dead_words"?: NonNullable<Json>,"exemplar_paragraphs"?: NonNullable<Json>,"greeting"?: string | null,"id"?: string,"idiom_bank"?: NonNullable<Json>,"name"?: string,"offer_id"?: string | null,"parameters"?: NonNullable<Json>,"readability_band"?: string | null,"samples"?: NonNullable<Json>,"story_inventory"?: NonNullable<Json>,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "voice_profiles_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "voice_profiles_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_invites": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"role": string,"token": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role": string,"token"?: string,"workspace_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"role"?: string,"token"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_invites_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "created_at": string,"role": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role": string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"instruction_memory": NonNullable<Json>,"name": string,"settings": NonNullable<Json>,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"instruction_memory"?: NonNullable<Json>,"name": string,"settings"?: NonNullable<Json>,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"instruction_memory"?: NonNullable<Json>,"name"?: string,"settings"?: NonNullable<Json>,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "llm_cost_by_step": {
                  Row: {
                    "avg_latency_ms": number | null,"cache_read_tokens": number | null,"cache_write_tokens": number | null,"calls": number | null,"cost_usd": number | null,"day": string | null,"input_tokens": number | null,"model": string,"output_tokens": number | null,"step": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"workspace_usage_monthly": {
                  Row: {
                    "cost_usd": number | null,"generations": number | null,"month": string | null,"tokens": number | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "accept_invite":
{ Args: { "invite_token": string }; Returns: string
                           },
"admin_get_setting":
{ Args: { "p_key": string }; Returns: string
                           },
"admin_set_setting":
{ Args: { "p_key": string,"p_value": string }; Returns: undefined
                           },
"dearmor":
{ Args: { "": string }; Returns: string
                           },
"enqueue_step":
{ Args: { "p_delay_seconds"?: number,"p_generation_id": string,"p_step": string }; Returns: undefined
                           },
"gen_random_uuid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"gen_salt":
{ Args: { "": string }; Returns: string
                           },
"get_setting":
{ Args: { "p_key": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"leave_workspace":
{ Args: { "ws": string }; Returns: undefined
                           },
"match_critiques":
{ Args: { "match_count"?: number,"match_format": string,"query_embedding": string }; Returns: {
              "chief": string,"defect_named": string,"format": string,"id": string,"principle": string,"similarity": number,"strong_revision": string,"weak_draft": string
            }[]
                           },
"match_examples":
{ Args: { "exclude_losers"?: boolean,"match_count"?: number,"match_format": string,"query_embedding": string }; Returns: {
              "annotations": Json,"argument_sentence": string,"excerpt": string,"format": string,"id": string,"lead_type": string,"lessons": Json,"similarity": number,"title": string
            }[]
                           },
"pgp_armor_headers":
{ Args: { "": string }; Returns: Record<string, unknown>[]
                           },
"queue_ack":
{ Args: { "p_msg_id": number }; Returns: boolean
                           },
"queue_archive":
{ Args: { "p_msg_id": number }; Returns: boolean
                           },
"record_usage":
{ Args: { "p_attempt": number,"p_cost": number,"p_generation_id": string,"p_kind": string,"p_step": string,"p_tokens": number,"p_workspace_id": string }; Returns: undefined
                           },
"requeue_generation":
{ Args: { "p_from_step": string,"p_generation_id": string }; Returns: undefined
                           },
"set_setting":
{ Args: { "p_key": string,"p_value": string }; Returns: undefined
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"workspace_role":
{ Args: { "ws": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
