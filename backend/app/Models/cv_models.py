from pydantic import BaseModel, Field


class SuggestedBullet(BaseModel):
    original: str
    improved: str


class CategoryScores(BaseModel):
    role_alignment: int = Field(ge=0, le=100)
    skills_match: int = Field(ge=0, le=100)
    experience_relevance: int = Field(ge=0, le=100)
    ats_keyword_match: int = Field(ge=0, le=100)
    bullet_point_quality: int = Field(ge=0, le=100)
    structure_readability: int = Field(ge=0, le=100)
    missing_evidence: int = Field(ge=0, le=100)


class CategoryBreakdown(BaseModel):
    explanation: str
    what_is_weak: str
    how_to_improve: str


class CategoryBreakdowns(BaseModel):
    role_alignment: CategoryBreakdown
    skills_match: CategoryBreakdown
    experience_relevance: CategoryBreakdown
    ats_keyword_match: CategoryBreakdown
    bullet_point_quality: CategoryBreakdown
    structure_readability: CategoryBreakdown
    missing_evidence: CategoryBreakdown


class ReviewResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    ats_score: int = Field(ge=0, le=100)
    recruiter_score: int = Field(ge=0, le=10)
    category_scores: CategoryScores
    category_breakdowns: CategoryBreakdowns
    recruiter_reasoning: str
    role_alignment: str
    missing_keywords: list[str]
    strengths: list[str]
    weaknesses: list[str]
    section_recommendations: list[str]
    suggested_bullets: list[SuggestedBullet]
