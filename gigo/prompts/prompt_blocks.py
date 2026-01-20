"""
Prompt Blocks Registry

Centralized registry of reusable prompt blocks for video analysis.
Each block represents a configurable editing preference that users
can toggle on/off in the mobile app.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class BlockType(Enum):
    """Type of prompt block - affects how it's displayed and processed."""

    REMOVE = "remove"
    KEEP = "keep"


@dataclass
class PromptBlock:
    """
    A single prompt block that can be toggled by the user.

    Attributes:
        id: Unique identifier for the block
        label: Short UI label (e.g., "Dead Air")
        description: Longer description for subtitle
        type: Whether this is a REMOVE or KEEP instruction
        prompt_template: The prompt text with {placeholders} for config values
        config_type: Optional config UI type ("slider", "select", or None)
        config_options: Config parameters (min/max/default for slider, etc.)
    """

    id: str
    label: str
    description: str
    type: BlockType
    prompt_template: str
    config_type: str | None = None
    config_options: dict[str, Any] = field(default_factory=dict)


# =============================================================================
# BLOCK REGISTRY
# =============================================================================

PROMPT_BLOCKS: dict[str, PromptBlock] = {
    # === REMOVE BLOCKS ===
    "ums_uhs": PromptBlock(
        id="ums_uhs",
        label="Ums & Uhs",
        description="Remove filler words like 'um', 'uh', 'er', 'like'",
        type=BlockType.REMOVE,
        prompt_template="Remove filler words ('um', 'uh', 'er', 'like') when they interrupt speech flow.",
    ),
    "stutters": PromptBlock(
        id="stutters",
        label="Stutters",
        description="Remove word repetition (e.g., 'I I I went')",
        type=BlockType.REMOVE,
        prompt_template="Remove stuttering and word repetition.",
    ),
    "dead_air": PromptBlock(
        id="dead_air",
        label="Dead Air",
        description="Remove long silences",
        type=BlockType.REMOVE,
        prompt_template="Remove silence lasting > {threshold}s where nothing happens visually.",
        config_type="slider",
        config_options={
            "min": 1,
            "max": 5,
            "default": 2,
            "unit": "s",
            "param": "threshold",
        },
    ),
    "false_starts": PromptBlock(
        id="false_starts",
        label="False Starts",
        description="Remove when speaker restarts a sentence",
        type=BlockType.REMOVE,
        prompt_template="Remove false starts where speaker stops mid-sentence and restarts entirely.",
    ),
    "off_camera": PromptBlock(
        id="off_camera",
        label="Looking Away",
        description="Remove when speaker looks at notes or phone",
        type=BlockType.REMOVE,
        prompt_template="Remove moments where speaker looks at notes, phone, or off-camera.",
    ),
    # === KEEP BLOCKS ===
    "thinking_pauses": PromptBlock(
        id="thinking_pauses",
        label="Thinking Pauses",
        description="Keep thoughtful silences",
        type=BlockType.KEEP,
        prompt_template="KEEP moments where speaker is silent but looks thoughtful or pensive.",
    ),
    "natural_laughs": PromptBlock(
        id="natural_laughs",
        label="Laughs & Smiles",
        description="Keep natural moments of levity",
        type=BlockType.KEEP,
        prompt_template="KEEP small chuckles, smiles, or natural human moments.",
    ),
    "emphasis": PromptBlock(
        id="emphasis",
        label="Emphatic Repetition",
        description="Keep intentional word repetition for effect",
        type=BlockType.KEEP,
        prompt_template="KEEP intentional word repetition for rhetorical emphasis (e.g., 'very very important').",
    ),
}


def get_blocks_for_api() -> list[dict]:
    """
    Return blocks as JSON-serializable list for mobile app.

    Returns:
        List of block dictionaries with UI-relevant fields.
    """
    return [
        {
            "id": block.id,
            "label": block.label,
            "description": block.description,
            "type": block.type.value,
            "config_type": block.config_type,
            "config_options": block.config_options if block.config_options else None,
        }
        for block in PROMPT_BLOCKS.values()
    ]


def build_user_instructions(
    enabled_blocks: list[dict],
    custom_text: str | None = None,
) -> str:
    """
    Convert selected blocks + config values into prompt injection text.

    Args:
        enabled_blocks: List of dicts like {"id": "dead_air", "config": {"threshold": 3}}
        custom_text: Optional freeform user instructions

    Returns:
        Formatted string to inject into the analysis prompt.
    """
    lines = ["=== USER PREFERENCES ==="]

    remove_lines: list[str] = []
    keep_lines: list[str] = []

    for block_data in enabled_blocks:
        block_id = block_data.get("id")
        config = block_data.get("config", {})

        if block_id not in PROMPT_BLOCKS:
            continue

        block = PROMPT_BLOCKS[block_id]

        # Substitute config values into template
        prompt_text = block.prompt_template
        for key, value in config.items():
            prompt_text = prompt_text.replace(f"{{{key}}}", str(value))

        # Fill in defaults for any remaining placeholders
        if block.config_options and "default" in block.config_options:
            param = block.config_options.get("param", "value")
            default_val = block.config_options["default"]
            prompt_text = prompt_text.replace(f"{{{param}}}", str(default_val))

        if block.type == BlockType.REMOVE:
            remove_lines.append(f"  - {prompt_text}")
        else:
            keep_lines.append(f"  - {prompt_text}")

    if remove_lines:
        lines.append("REMOVE:")
        lines.extend(remove_lines)

    if keep_lines:
        lines.append("KEEP:")
        lines.extend(keep_lines)

    if custom_text:
        lines.append(f"ADDITIONAL: {custom_text}")

    return "\n".join(lines)
