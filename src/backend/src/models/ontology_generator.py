"""Pydantic models for the ontology generator API."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TableColumnInput(BaseModel):
    """A column in a table."""
    name: str
    type: str = "STRING"
    comment: str = ""


class TableInput(BaseModel):
    """A table with its columns."""
    name: str
    full_name: str = ""
    comment: str = ""
    columns: List[TableColumnInput] = Field(default_factory=list)


class MetadataInput(BaseModel):
    """Metadata payload containing tables."""
    tables: List[TableInput] = Field(default_factory=list)


class GenerateOntologyRequest(BaseModel):
    """Request body for POST /api/ontology/generate."""
    metadata: MetadataInput
    guidelines: str = ""
    base_uri: str = "http://ontos.example.org/ontology#"
    selected_tables: Optional[List[str]] = None
    include_data_properties: bool = True
    include_relationships: bool = True
    include_inheritance: bool = True


class GenerateFromConnectionRequest(BaseModel):
    """Request body for POST /api/ontology/generate-from-connection."""
    connection_id: str
    selected_paths: List[str] = Field(..., min_length=1)
    guidelines: str = ""
    base_uri: str = "http://ontos.example.org/ontology#"
    include_data_properties: bool = True
    include_relationships: bool = True
    include_inheritance: bool = True


class AgentStepResponse(BaseModel):
    """One step of the agent execution."""
    step_type: str
    content: str
    tool_name: str = ""
    duration_ms: int = 0


class OntologyClassResponse(BaseModel):
    """A generated OWL class."""
    uri: str
    name: str
    label: str = ""
    comment: str = ""
    emoji: str = ""
    parent: str = ""
    dashboard: str = ""
    dashboardParams: Dict[str, Any] = Field(default_factory=dict)
    dataProperties: List[Dict[str, str]] = Field(default_factory=list)


class OntologyPropertyResponse(BaseModel):
    """A generated OWL property."""
    uri: str
    name: str
    label: str = ""
    comment: str = ""
    type: str = "ObjectProperty"
    domain: str = ""
    range: str = ""


class OntologyInfoResponse(BaseModel):
    """Basic ontology info."""
    uri: str = ""
    label: str = ""
    comment: str = ""
    namespace: str = ""


class GenerateOntologyResponse(BaseModel):
    """Response from POST /api/ontology/generate."""
    success: bool
    owl_content: str = ""
    classes: List[OntologyClassResponse] = Field(default_factory=list)
    properties: List[OntologyPropertyResponse] = Field(default_factory=list)
    ontology_info: OntologyInfoResponse = Field(default_factory=OntologyInfoResponse)
    constraints: List[Dict[str, Any]] = Field(default_factory=list)
    axioms: List[Dict[str, Any]] = Field(default_factory=list)
    steps: List[AgentStepResponse] = Field(default_factory=list)
    iterations: int = 0
    error: str = ""
    usage: Dict[str, int] = Field(default_factory=dict)


class SaveToCollectionRequest(BaseModel):
    """Request body for POST /api/ontology/save-to-collection."""
    owl_content: str = Field(..., min_length=1)
    collection_name: str = Field(..., min_length=1)
    collection_description: str = ""


class SaveToCollectionResponse(BaseModel):
    """Response from POST /api/ontology/save-to-collection."""
    success: bool
    collection_iri: str = ""
    triples_imported: int = 0
    error: str = ""
