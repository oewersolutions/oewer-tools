"use client";

import { useState } from "react";
import { evaluateSubnet, type SubnetRaw } from "../../lib/tools/subnet";
import { NumberField, Results, ToolLayout } from "./ui";

export default function SubnetCalculator() {
  const [raw, setRaw] = useState<SubnetRaw>({
    address: "192.168.1.10",
    prefix: "24",
  });
  const { errors, result } = evaluateSubnet(raw);

  return (
    <ToolLayout
      dark
      workings={result?.workings}
      inputs={
        <>
          <NumberField
            label="IPv4 address"
            value={raw.address}
            onChange={(v) => setRaw((r) => ({ ...r, address: v }))}
            error={errors.address}
            placeholder="192.168.1.10"
          />
          <NumberField
            label="Prefix length or mask"
            value={raw.prefix}
            onChange={(v) => setRaw((r) => ({ ...r, prefix: v }))}
            error={errors.prefix}
            hint="For example 24, /24 or 255.255.255.0."
          />
        </>
      }
      results={
        <Results
          emptyMessage="Enter an IPv4 address and a prefix length."
          headline={result && { label: "Network", value: result.cidr }}
          rows={
            result && [
              { label: "Subnet mask", value: result.mask },
              { label: "Wildcard mask", value: result.wildcard },
              { label: "Broadcast address", value: result.broadcast },
              { label: "First usable host", value: result.firstHost },
              { label: "Last usable host", value: result.lastHost },
              {
                label: "Total addresses",
                value: result.total.toLocaleString("en-IN"),
              },
              {
                label: "Usable hosts",
                value: result.usable.toLocaleString("en-IN"),
              },
              { label: "Class", value: result.addressClass },
              { label: "Range", value: result.privateRange },
            ]
          }
        />
      }
    />
  );
}
