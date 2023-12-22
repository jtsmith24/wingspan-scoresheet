import React from 'react'

export interface VerticalTextColumnProps {

}

export const VerticalTextColumn = ({}) => {
  return (
        <>
        <div className="flex h-36 border-t-2 items-center justify-center whitespace-nowrap bg-green-200">
          <div
            className="w-full text-black"
            style={{
              writingMode: "vertical-lr",
              textAlign: "center",
              transform: "rotate(180deg)",
            }}
          >
            Amount On Cards
          </div>
        </div>
        <div className="flex h-36 items-center justify-center whitespace-nowrap bg-blue-200">
          <div
            className="w-full text-black"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            1 Point Each
          </div>
        </div>
      </>
  )
}
