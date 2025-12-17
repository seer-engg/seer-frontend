/**
 * Polyfills for LangGraph streaming bugs.
 *
 * LangGraph currently emits multiple ToolMessageChunk updates that have an
 * undefined `artifact` value. When the SDK tries to merge those chunks it
 * calls `_mergeObj`, which throws if both operands are undefined. That
 * crash bubbles up as "Cannot merge two undefined objects" and stops the
 * stream.
 *
 * We patch the ToolMessageChunk.concat implementation so that it skips the
 * artifact merge entirely when both sides are undefined, mirroring the
 * behaviour we expect from upstream once fixed.
 */

import {
  ToolMessageChunk,
  _mergeDicts,
  _mergeStatus,
  mergeContent,
} from '@langchain/core/messages';

type ToolChunkCtor = typeof ToolMessageChunk;
type PatchedToolChunk = ToolMessageChunk & {
  __seerLanggraphPatched?: boolean;
};

function patchToolMessageChunkConcat() {
  const proto = ToolMessageChunk.prototype as PatchedToolChunk;

  if (proto.__seerLanggraphPatched) return;
  proto.__seerLanggraphPatched = true;

  const originalConcat = proto.concat;

  proto.concat = function patchedConcat(this: ToolMessageChunk, chunk: ToolMessageChunk) {
    const Cls = this.constructor as ToolChunkCtor;

    if (this.artifact == null && chunk.artifact == null) {
      return new Cls({
        content: mergeContent(this.content, chunk.content),
        additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
        response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
        artifact: undefined,
        tool_call_id: this.tool_call_id,
        id: this.id ?? chunk.id,
        status: _mergeStatus(this.status, chunk.status),
      });
    }

    if (this.artifact != null && chunk.artifact != null) {
      return originalConcat.call(this, chunk);
    }

    return new Cls({
      content: mergeContent(this.content, chunk.content),
      additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
      response_metadata: _mergeDicts(this.response_metadata, chunk.response_metadata),
      artifact: this.artifact ?? chunk.artifact,
      tool_call_id: this.tool_call_id,
      id: this.id ?? chunk.id,
      status: _mergeStatus(this.status, chunk.status),
    });
  };
}

patchToolMessageChunkConcat();

