import React from 'react'

export interface VerticalTextColumnProps {

}

export const VerticalTextColumn = ({}) => {
  return (
        <>
        <div className="flex h-60 border-t-2 border-slate-500 items-center justify-center whitespace-nowrap bg-green-200">
          <div
            className="w-full text-black font-medium"
            style={{
              writingMode: "vertical-lr",
              textAlign: "center",
              transform: "rotate(180deg)",
            }}
          >
            Amount On Cards
          </div>
        </div>
        <div className="flex h-60 items-center justify-center whitespace-nowrap bg-blue-300">
          <div
            className="w-full text-black font-medium"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            1 Point Each
          </div>
        </div>
      </>
  )
}
