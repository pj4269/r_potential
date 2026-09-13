FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt ${LAMBDA_TASK_ROOT}/

RUN pip install \
    --no-cache-dir \
    -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY sep_handler.py ${LAMBDA_TASK_ROOT}/

CMD ["sep_handler.lambda_handler"]
