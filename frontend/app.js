const {
  createServer,
} = require(
  'http',
);

const next = require(
  'next',
);


const app = next({
  dev:
    false,
});


const handle =
  app.getRequestHandler();


app
  .prepare()
  .then(
    () => {
      createServer(
        (
          request,
          response,
        ) =>
          handle(
            request,
            response,
          ),
      ).listen(
        process.env.PORT ||
          3000,
      );
    },
  )
  .catch(
    (error) => {
      // Passenger writes stdout/stderr to the application log.
      console.error(
        error,
      );

      process.exit(
        1,
      );
    },
  );
