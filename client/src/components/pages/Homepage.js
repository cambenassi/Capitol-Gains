import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';

import { getPolitician } from '../politicians';
import '../../App.css';
import placeholder from '../images/placeholder.jpg';
import pie from '../images/Pie.jpg';
import line from '../images/line.png';
import Trades from '../Trades';

export default function Homepage() {

  let params = useParams();

  let politician = getPolitician(parseInt(params.politicianId, 10));

  const [trades] = useState([
    {
      id: 1,
      date: '5/6/2021',
      politician: <Link to={`/politician/3`}> Abraham</Link>,
      stock: 'TSLA',
      sector: 'Auto',
      buy_sell: 'Sell',
      amount: '$250,000-$500,000',
    },
    {
      id: 2,
      date: '3/4/2020',
      stock: 'GOOG',
      sector: 'Tech',
      buy_sell: 'Buy',
      amount: '$15,000-$50,000',
    },
    {
      id: 3,
      date: '1/2/2019',
      stock: 'AAPL',
      sector: 'Tech',
      buy_sell: 'Buy',
      amount: '$15,001-$50,000',
    },
    {
      id: 4,
      date: '11/12/2001',
      stock: 'AMZN',
      sector: 'Retail',
      buy_sell: 'Buy',
      amount: '$500,000-$1,000,000',
    },
    {
      id: 5,
      date: '9/10/2000',
      stock: 'CSCO',
      sector: 'Tech',
      buy_sell: 'Sell',
      amount: '$500,000-$1,000,000',
    },
    {
      id: 6,
      date: '7/8/1999',
      stock: 'T',
      sector: 'Telecom',
      buy_sell: 'Buy',
      amount: '$1001-$15,000',
    },
    {
      id: 7,
      date: '8/14/1995',
      stock: 'GME',
      sector: 'Retail',
      buy_sell: 'Buy',
      amount: '$1001-$15,000',
    },
    {
      id: 8,
      date: '5/6/1998',
      stock: 'F',
      sector: 'Auto',
      buy_sell: 'Buy',
      amount: '$50,001-$100,000',
    },
  ])


    return (
    <>
    <div className="background">
    <Container>
    <h1 className='topmoverheader'></h1>
    <Row className='topmover-container'>
            {/*<Col lg={3} md={6} sm={6}>
                <img className="topmover-pic" src={placeholder} alt="placeholder"/>
                <div className="topmover-info">
                <h4>Politician title</h4>
                <h4>Politician Name</h4>
                </div>
            </Col>*/}
            <Col lg={6} md={6} sm={6}><img className="topmoverpie-pic" src={pie} alt="piechart"/></Col>
            <Col lg={6} md={12} sm={12}><img className="topmoverline-pic" src={line} alt="linegraph"/></Col>
    </Row>
    </Container>
    <Container>
    <Row className='recent-container'>
            <h1 className='recentheader'>Recent Transactions</h1>
            <Col className="recent-transaction" lg={12} md={12} sm={12}><Trades trades={trades}/></Col>
            {/*<Col className="homepage-graph" lg={5} md={12} sm={12}><img className="topmoverline-pic" src={line} alt="linegraph"/></Col>*/}
    </Row>
    </Container>
    <div className='footer'><p>@2022 Capitol Gains Inc. All Rights Reserved</p></div>
    </div>
    </>
  );
}


