import Button from '@/components/ui/Button';
export default function Hero() {
  return (
    <div className="mb-24 grid place-content-center text-center">
      <h1 className="text-4xl tracking-tighter text-pretty max-lg:font-medium sm:text-5xl lg:text-6xl xl:text-8xl text-foreground pb-6 max-w-6xl">
        Where teaching and learning come togheter
      </h1>
      <p className="max-w-6xl text-base/7 sm:text-lg/7 font-medium text-gray-600 dark:text-gray-400 mb-10 text-balance">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Reiciendis
        blanditiis eligendi ratione quaerat! Id maxime suscipit consequatur
        tempore vel culpa.
      </p>
      <Button className="mx-auto">Get started</Button>
				{/*   <div className="mt-24 bg-gray-100 w-full h-[70vh] rounded-lg p-3 relative"> */}
				{/*     <div className="bg-slate-300 w-full h-full rounded-md"></div> */}
				{/**/}
				{/* <div */}
				{/* 	className=" pointer-events-none absolute inset-x-0 -bottom-12 h-1/3 bg-linear-to-t from-background via-background to-transparent lg:h-1/4" */}
				{/* /> */}
				{/*   </div> */}


    </div>
  );
}
