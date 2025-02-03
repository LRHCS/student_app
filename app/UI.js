import styled from "styled-components";


export const Card = styled.div`
    border-width: thin;
    padding: 1rem;
    border-radius: 0.75rem;
    border-color: rgb(156 163 175);
    margin-right: 0.75rem;
    margin-bottom: 0.75rem;
    width: 100%;
    max-width: 20rem;

    @media (min-width: 640px) {
        padding: 1.5rem;
    }

    &:hover {
        background-color: rgb(229 231 235);
    }
`

